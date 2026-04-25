"""
BERT-based Resume-Job Matching Model Training Script
Trains a Sentence-BERT model for semantic matching between resumes and job descriptions.

Uses a multi-interaction architecture that captures:
  - Cosine similarity (global alignment)
  - Element-wise difference (what's missing/extra)
  - Element-wise product (shared concepts)
  - Concatenation (full context)

Usage:
    python train_bert_model.py --dataset path/to/dataset.csv

The dataset should have columns: Resume, Job_Description, decision (select/reject)
"""

import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from sentence_transformers import SentenceTransformer
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
import pickle
import os
import argparse
import json
from datetime import datetime


# ─── Configuration ───
class Config:
    SBERT_MODEL = 'all-MiniLM-L6-v2'  # Lightweight S-BERT (384-dim, 80MB)
    EMBEDDING_DIM = 384
    HIDDEN_DIM = 256
    DROPOUT = 0.4
    BATCH_SIZE = 64
    EPOCHS = 30
    LEARNING_RATE = 1e-3
    WEIGHT_DECAY = 1e-4
    TEST_SPLIT = 0.2
    RANDOM_SEED = 42
    MAX_TEXT_LENGTH = 2000  # Max chars — S-BERT handles token truncation internally (~256 tokens)
    DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
    PATIENCE = 7  # Early stopping patience


# ─── Dataset Class ───
class ResumeJobDataset(Dataset):
    """Dataset for resume-job matching pairs"""

    def __init__(self, resume_embeddings, job_embeddings, labels):
        self.resume_emb = torch.FloatTensor(resume_embeddings)
        self.job_emb = torch.FloatTensor(job_embeddings)
        self.labels = torch.FloatTensor(labels)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return self.resume_emb[idx], self.job_emb[idx], self.labels[idx]


# ─── BERT Matching Model (Multi-Interaction Architecture) ───
class BERTMatchingModel(nn.Module):
    """
    Multi-interaction dual-stream neural network for resume-job matching.

    Instead of simple concatenation, this model captures FOUR types of
    interaction between resume and job embeddings:

    1. Cosine Similarity  (1-dim)  — global semantic alignment
    2. Element-wise Diff   (384-dim) — what skills/experience are missing or extra
    3. Element-wise Product (384-dim) — shared concepts between resume & job
    4. Concatenation        (768-dim) — full context for the classifier

    Combined: 1 + 384 + 384 + 768 = 1537 features → Dense layers → Match score

    This architecture is inspired by InferSent (Conneau et al., 2017) and
    common practice in NLI and semantic matching tasks.
    """

    def __init__(self, embedding_dim=384, hidden_dim=256, dropout=0.4):
        super(BERTMatchingModel, self).__init__()

        # Input: cosine_sim(1) + diff(384) + product(384) + concat(768) = 1537
        interaction_dim = 1 + embedding_dim + embedding_dim + embedding_dim * 2

        self.network = nn.Sequential(
            nn.Linear(interaction_dim, hidden_dim),    # 1537 → 256
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),    # 256 → 128
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.Dropout(dropout * 0.6),
            nn.Linear(hidden_dim // 2, 64),            # 128 → 64
            nn.ReLU(),
            nn.BatchNorm1d(64),
            nn.Dropout(dropout * 0.4),
            nn.Linear(64, 1),                          # 64 → 1
            nn.Sigmoid()
        )

    def forward(self, resume_emb, job_emb):
        # 1. Cosine similarity (captures global semantic alignment)
        cos_sim = F.cosine_similarity(resume_emb, job_emb, dim=1).unsqueeze(1)  # (batch, 1)

        # 2. Element-wise absolute difference (captures gaps)
        diff = torch.abs(resume_emb - job_emb)  # (batch, 384)

        # 3. Element-wise product (captures shared concepts)
        product = resume_emb * job_emb  # (batch, 384)

        # 4. Concatenation (full context)
        concat = torch.cat([resume_emb, job_emb], dim=1)  # (batch, 768)

        # Combine all interactions
        combined = torch.cat([cos_sim, diff, product, concat], dim=1)  # (batch, 1537)
        return self.network(combined).squeeze()


# ─── Data Loading & Preprocessing ───
def load_dataset(csv_path):
    """Load and preprocess the dataset"""
    print(f"📂 Loading dataset from {csv_path}...")
    df = pd.read_csv(csv_path)

    print(f"   Total rows: {len(df)}")
    print(f"   Columns: {list(df.columns)}")

    # Handle different column names
    resume_col = None
    jd_col = None
    label_col = None

    for col in df.columns:
        if col.lower() in ['resume', 'resume_text', 'cv']:
            resume_col = col
        if col.lower() in ['job_description', 'jd', 'job_desc', 'description']:
            jd_col = col
        if col.lower() in ['decision', 'label', 'result', 'outcome']:
            label_col = col

    if not all([resume_col, jd_col, label_col]):
        raise ValueError(f"Could not find required columns. Found: Resume={resume_col}, JD={jd_col}, Label={label_col}")

    print(f"   Using columns: Resume='{resume_col}', JD='{jd_col}', Label='{label_col}'")

    # Check for transcript column (decisions often depend on interview performance)
    transcript_col = None
    for col in df.columns:
        if col.lower() in ['transcript', 'interview', 'interview_transcript']:
            transcript_col = col
            break

    if transcript_col:
        print(f"   📋 Found transcript column: '{transcript_col}' — will combine with resume")

    # Clean data
    df = df.dropna(subset=[resume_col, jd_col, label_col])

    # Convert labels to binary (1 = hire/select, 0 = reject)
    label_map = {
        'select': 1, 'hire': 1, 'hired': 1, 'pass': 1, 'yes': 1, 'accept': 1, 'selected': 1, '1': 1,
        'reject': 0, 'rejected': 0, 'fail': 0, 'no': 0, 'decline': 0, '0': 0
    }
    df['label'] = df[label_col].astype(str).str.lower().str.strip().map(label_map)
    df = df.dropna(subset=['label'])
    df['label'] = df['label'].astype(int)

    print(f"   After cleaning: {len(df)} samples")
    print(f"   Label distribution: {dict(df['label'].value_counts())}")

    # Build candidate text: Resume + Interview Transcript (if available)
    # The transcript captures interview performance which strongly influences decisions
    if transcript_col and transcript_col in df.columns:
        df['resume_text'] = (
            df[resume_col].astype(str).str[:Config.MAX_TEXT_LENGTH] +
            " [INTERVIEW] " +
            df[transcript_col].astype(str).str[:Config.MAX_TEXT_LENGTH]
        )
        print(f"   ✅ Combined resume + transcript (up to {Config.MAX_TEXT_LENGTH*2} chars per candidate)")
    else:
        df['resume_text'] = df[resume_col].astype(str).str[:Config.MAX_TEXT_LENGTH]

    df['jd_text'] = df[jd_col].astype(str).str[:Config.MAX_TEXT_LENGTH]

    return df


def load_supplementary_data(csv_path):
    """Load supplementary dataset (ml_resume_dataset_4500.csv format)"""
    print(f"📂 Loading supplementary data from {csv_path}...")
    df = pd.read_csv(csv_path)

    if 'raw_text' in df.columns and 'label' in df.columns:
        df = df.dropna(subset=['raw_text', 'label'])
        # Create a synthetic JD from skills
        if 'skills' in df.columns:
            df['jd_text'] = df['skills'].apply(
                lambda x: f"Looking for a candidate with skills in {x}. "
                         f"Experience in software development required."
            )
        else:
            df['jd_text'] = "Software developer position requiring technical skills and experience."

        df['resume_text'] = df['raw_text'].astype(str).str[:Config.MAX_TEXT_LENGTH]
        df['jd_text'] = df['jd_text'].str[:Config.MAX_TEXT_LENGTH]
        df['label'] = df['label'].astype(int)

        print(f"   Added {len(df)} supplementary samples")
        return df[['resume_text', 'jd_text', 'label']]

    return pd.DataFrame()


def generate_embeddings(texts, sbert_model, batch_size=64):
    """Generate S-BERT embeddings for a list of texts"""
    print(f"   Generating embeddings for {len(texts)} texts...")
    embeddings = sbert_model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True
    )
    return embeddings


# ─── Training ───
def train_model(train_loader, val_loader, model, config):
    """Train the BERT matching model with early stopping and cosine annealing"""
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config.LEARNING_RATE,
        weight_decay=config.WEIGHT_DECAY
    )
    criterion = nn.BCELoss()
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=10, T_mult=1, eta_min=1e-6
    )

    best_val_f1 = 0
    best_model_state = None
    patience_counter = 0
    history = {'train_loss': [], 'val_loss': [], 'val_acc': [], 'val_f1': []}

    for epoch in range(config.EPOCHS):
        # Training phase
        model.train()
        train_loss = 0
        for resume_emb, job_emb, labels in train_loader:
            resume_emb = resume_emb.to(config.DEVICE)
            job_emb = job_emb.to(config.DEVICE)
            labels = labels.to(config.DEVICE)

            optimizer.zero_grad()
            outputs = model(resume_emb, job_emb)
            loss = criterion(outputs, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            train_loss += loss.item()

        scheduler.step()
        avg_train_loss = train_loss / len(train_loader)

        # Validation phase
        model.eval()
        val_loss = 0
        all_preds = []
        all_labels = []

        with torch.no_grad():
            for resume_emb, job_emb, labels in val_loader:
                resume_emb = resume_emb.to(config.DEVICE)
                job_emb = job_emb.to(config.DEVICE)
                labels = labels.to(config.DEVICE)

                outputs = model(resume_emb, job_emb)
                loss = criterion(outputs, labels)
                val_loss += loss.item()

                preds = (outputs > 0.5).float()
                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())

        avg_val_loss = val_loss / len(val_loader)
        val_acc = accuracy_score(all_labels, all_preds)
        val_f1 = f1_score(all_labels, all_preds)
        val_prec = precision_score(all_labels, all_preds, zero_division=0)
        val_rec = recall_score(all_labels, all_preds, zero_division=0)

        history['train_loss'].append(avg_train_loss)
        history['val_loss'].append(avg_val_loss)
        history['val_acc'].append(val_acc)
        history['val_f1'].append(val_f1)

        lr_now = optimizer.param_groups[0]['lr']
        print(f"   Epoch {epoch+1}/{config.EPOCHS} | "
              f"Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} | "
              f"Acc: {val_acc:.4f} | F1: {val_f1:.4f} | Prec: {val_prec:.4f} | Rec: {val_rec:.4f} | "
              f"LR: {lr_now:.6f}")

        # Save best model
        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_model_state = model.state_dict().copy()
            patience_counter = 0
            print(f"   ✅ New best model! F1: {val_f1:.4f}")
        else:
            patience_counter += 1
            if patience_counter >= config.PATIENCE:
                print(f"   ⏹️ Early stopping at epoch {epoch+1} (no improvement for {config.PATIENCE} epochs)")
                break

    # Load best model
    if best_model_state:
        model.load_state_dict(best_model_state)

    return model, history


# ─── Main Training Pipeline ───
def main(args):
    config = Config()

    print("=" * 60)
    print("🚀 BERT Resume-Job Matching Model Training")
    print("=" * 60)
    print(f"   Device: {config.DEVICE}")
    print(f"   S-BERT Model: {config.SBERT_MODEL}")
    print(f"   Epochs: {config.EPOCHS}")
    print(f"   Batch Size: {config.BATCH_SIZE}")
    print()

    # Step 1: Load S-BERT model
    print("📥 Loading Sentence-BERT model...")
    sbert = SentenceTransformer(config.SBERT_MODEL)
    print(f"   ✅ Loaded {config.SBERT_MODEL} ({config.EMBEDDING_DIM}-dim embeddings)")
    print()

    # Step 2: Load dataset
    df = load_dataset(args.dataset)

    # Load supplementary data if provided
    if args.supplementary:
        supp_df = load_supplementary_data(args.supplementary)
        if len(supp_df) > 0:
            df = pd.concat([
                df[['resume_text', 'jd_text', 'label']],
                supp_df
            ], ignore_index=True)
            print(f"   Combined dataset: {len(df)} total samples")

    print()

    # Step 3: Generate embeddings
    print("🧠 Generating S-BERT embeddings...")
    resume_embeddings = generate_embeddings(df['resume_text'].tolist(), sbert)
    job_embeddings = generate_embeddings(df['jd_text'].tolist(), sbert)
    labels = df['label'].values
    print(f"   ✅ Resume embeddings: {resume_embeddings.shape}")
    print(f"   ✅ Job embeddings: {job_embeddings.shape}")
    print()

    # Step 4: Train/test split
    print("📊 Splitting data...")
    (resume_train, resume_val, job_train, job_val,
     labels_train, labels_val) = train_test_split(
        resume_embeddings, job_embeddings, labels,
        test_size=config.TEST_SPLIT,
        random_state=config.RANDOM_SEED,
        stratify=labels
    )
    print(f"   Train: {len(labels_train)} samples | Val: {len(labels_val)} samples")
    print()

    # Step 5: Create data loaders
    train_dataset = ResumeJobDataset(resume_train, job_train, labels_train)
    val_dataset = ResumeJobDataset(resume_val, job_val, labels_val)

    train_loader = DataLoader(train_dataset, batch_size=config.BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=config.BATCH_SIZE, shuffle=False)

    # Step 6: Initialize model
    print("🏗️ Initializing BERT Multi-Interaction Matching Model...")
    model = BERTMatchingModel(
        embedding_dim=config.EMBEDDING_DIM,
        hidden_dim=config.HIDDEN_DIM,
        dropout=config.DROPOUT
    ).to(config.DEVICE)

    interaction_dim = 1 + config.EMBEDDING_DIM * 4  # cos_sim + diff + product + concat
    total_params = sum(p.numel() for p in model.parameters())
    print(f"   Interactions: CosSim(1) + Diff({config.EMBEDDING_DIM}) + Product({config.EMBEDDING_DIM}) + Concat({config.EMBEDDING_DIM*2})")
    print(f"   Architecture: {interaction_dim} → {config.HIDDEN_DIM} → {config.HIDDEN_DIM//2} → 64 → 1")
    print(f"   Total parameters: {total_params:,}")
    print()

    # Step 7: Train
    print("🔄 Training...")
    model, history = train_model(train_loader, val_loader, model, config)
    print()

    # Step 8: Final evaluation
    print("📈 Final Evaluation on Validation Set...")
    model.eval()
    all_preds = []
    all_probs = []
    all_labels = []

    with torch.no_grad():
        for resume_emb, job_emb, labels_batch in val_loader:
            resume_emb = resume_emb.to(config.DEVICE)
            job_emb = job_emb.to(config.DEVICE)

            outputs = model(resume_emb, job_emb)
            all_probs.extend(outputs.cpu().numpy())
            all_preds.extend((outputs > 0.5).float().cpu().numpy())
            all_labels.extend(labels_batch.numpy())

    print(classification_report(all_labels, all_preds, target_names=['Reject', 'Select']))

    final_acc = accuracy_score(all_labels, all_preds)
    final_f1 = f1_score(all_labels, all_preds)
    print(f"   Final Accuracy: {final_acc:.4f} ({final_acc*100:.1f}%)")
    print(f"   Final F1 Score: {final_f1:.4f}")
    print()

    # Step 9: Save everything
    save_dir = args.output_dir or os.path.dirname(os.path.abspath(__file__))
    os.makedirs(save_dir, exist_ok=True)

    # Save PyTorch model
    model_path = os.path.join(save_dir, 'bert_matching_model.pt')
    torch.save({
        'model_state_dict': model.state_dict(),
        'config': {
            'embedding_dim': config.EMBEDDING_DIM,
            'hidden_dim': config.HIDDEN_DIM,
            'dropout': config.DROPOUT,
            'sbert_model': config.SBERT_MODEL,
        },
        'metrics': {
            'accuracy': final_acc,
            'f1_score': final_f1,
            'train_samples': len(labels_train),
            'val_samples': len(labels_val),
        },
        'history': history,
    }, model_path)
    print(f"💾 Model saved to {model_path}")

    # Save background embeddings for SHAP (random sample of 100)
    bg_indices = np.random.choice(len(resume_train), min(100, len(resume_train)), replace=False)
    background_data = {
        'resume_embeddings': resume_train[bg_indices].tolist(),
        'job_embeddings': job_train[bg_indices].tolist(),
        'labels': labels_train[bg_indices].tolist(),
    }
    bg_path = os.path.join(save_dir, 'background_data.pkl')
    with open(bg_path, 'wb') as f:
        pickle.dump(background_data, f)
    print(f"💾 Background data saved to {bg_path}")

    # Save training metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'dataset': args.dataset,
        'total_samples': len(df),
        'train_samples': len(labels_train),
        'val_samples': len(labels_val),
        'accuracy': float(final_acc),
        'f1_score': float(final_f1),
        'sbert_model': config.SBERT_MODEL,
        'embedding_dim': config.EMBEDDING_DIM,
        'architecture': f'{interaction_dim} → {config.HIDDEN_DIM} → {config.HIDDEN_DIM//2} → 64 → 1',
        'model_type': 'multi-interaction',
        'interactions': ['cosine_similarity', 'element_wise_diff', 'element_wise_product', 'concatenation'],
        'total_parameters': total_params,
        'epochs': config.EPOCHS,
        'device': config.DEVICE,
    }
    meta_path = os.path.join(save_dir, 'bert_model_metadata.json')
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"💾 Metadata saved to {meta_path}")

    print()
    print("=" * 60)
    print("✅ Training complete!")
    print(f"   Accuracy: {final_acc*100:.1f}%")
    print(f"   F1 Score: {final_f1:.4f}")
    print(f"   Parameters: {total_params:,}")
    print("=" * 60)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train BERT Resume-Job Matching Model')
    parser.add_argument('--dataset', type=str, required=True, help='Path to main dataset CSV')
    parser.add_argument('--supplementary', type=str, default=None, help='Path to supplementary dataset CSV')
    parser.add_argument('--output-dir', type=str, default=None, help='Output directory for model files')
    args = parser.parse_args()

    main(args)
