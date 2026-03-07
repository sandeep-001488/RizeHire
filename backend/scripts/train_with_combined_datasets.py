#!/usr/bin/env python3
"""
Combined Kaggle Datasets to Training Data Converter
Combines ml_resume_dataset_4500 + Resume_Data into one training dataset
Total: 9,500+ samples for better accuracy
"""

import csv
import json
import os
from pathlib import Path

def load_ml_resume_dataset():
    """Load ml_resume_dataset_4500.csv"""
    training_data = []
    dataset_path = '/Users/sandeep.kumar/Downloads/ml_resume_dataset_4500.csv'

    if not os.path.exists(dataset_path):
        print(f"Error: File not found: {dataset_path}")
        return []

    with open(dataset_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        row_count = 0

        for row in reader:
            try:
                row_count += 1

                years_exp = float(row.get('years_experience', 0)) if row.get('years_experience') else 0
                skills_str = row.get('skills', '')
                degree = row.get('highest_degree', 'Bachelor')
                label = row.get('label', 'Rejected')

                skills_list = [s.strip() for s in skills_str.split(',') if s.strip()]
                num_skills = len(skills_list)

                skills_score = min(num_skills * 8, 100)
                exp_score = min(years_exp * 7, 100)

                education_scores = {
                    'High School': 20, 'Diploma': 25,
                    'B.Tech': 60, 'B.Sc': 60, 'Bachelor': 60, 'B.A': 60,
                    'Master': 80, 'M.Tech': 85, 'M.Sc': 85, 'MBA': 85,
                    'PhD': 95, 'Doctorate': 95
                }
                education_score = education_scores.get(degree, 50)
                salary_score = 60

                features = [
                    skills_score / 100,
                    exp_score / 100,
                    education_score / 100,
                    salary_score / 100
                ]

                outcome = 1.0 if 'pass' in label.lower() or 'accept' in label.lower() or 'yes' in label.lower() else 0.0

                training_data.append({
                    'input': features,
                    'output': outcome
                })

            except Exception as e:
                print(f"Warning: Error in row {row_count}: {e}")
                continue

    print(f"Loaded {row_count} rows, extracted {len(training_data)} samples from Dataset 1")
    return training_data


def load_resume_data():
    """Load Resume_Data.csv"""
    training_data = []
    dataset_path = '/Users/sandeep.kumar/Downloads/Resume_Data.csv'

    if not os.path.exists(dataset_path):
        print(f"Error: File not found: {dataset_path}")
        return []

    with open(dataset_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        row_count = 0

        for row in reader:
            try:
                row_count += 1

                years_exp = float(row.get('Experience (Years)', 0)) if row.get('Experience (Years)') else 0
                skills_str = row.get('Skills', '')
                education = row.get('Education', 'Bachelor')
                decision = row.get('Recruiter Decision', 'Reject')
                salary_str = row.get('Salary Expectation ($)', '50000')

                salary = float(salary_str.replace('$', '').replace(',', '')) if salary_str else 50000

                skills_list = [s.strip() for s in skills_str.split(',') if s.strip()]
                num_skills = len(skills_list)

                skills_score = min(num_skills * 8, 100)
                exp_score = min(years_exp * 7, 100)

                education_scores = {
                    'High School': 20, 'Diploma': 25,
                    'B.Tech': 60, 'B.Sc': 60, 'Bachelor': 60, 'B.A': 60,
                    'Master': 80, 'M.Tech': 85, 'M.Sc': 85, 'MBA': 85,
                    'PhD': 95, 'Doctorate': 95
                }
                education_score = education_scores.get(education, 50)

                salary_score = min(max((salary - 30000) / 1200, 0), 100)

                features = [
                    skills_score / 100,
                    exp_score / 100,
                    education_score / 100,
                    salary_score / 100
                ]

                outcome = 1.0 if 'hire' in decision.lower() else 0.0

                training_data.append({
                    'input': features,
                    'output': outcome
                })

            except Exception as e:
                print(f"Warning: Error in row {row_count}: {e}")
                continue

    print(f"Loaded {row_count} rows, extracted {len(training_data)} samples from Dataset 2")
    return training_data


def save_training_data(data):
    """Save combined training data"""
    output_dir = '/Users/sandeep.kumar/next.js/RizeHire/backend'
    output_path = os.path.join(output_dir, 'training_data.json')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    clean_data = [{'input': item['input'], 'output': item['output']} for item in data]

    with open(output_path, 'w') as f:
        json.dump(clean_data, f, indent=2)

    print(f"Saved {len(clean_data)} training samples to {output_path}")

    if clean_data:
        hire_count = sum(1 for item in clean_data if item['output'] == 1.0)
        reject_count = len(clean_data) - hire_count
        print(f"Composition: {hire_count} hired ({hire_count*100/len(clean_data):.1f}%), {reject_count} rejected ({reject_count*100/len(clean_data):.1f}%)")


def main():
    print("Combining datasets for ML training...")

    data1 = load_ml_resume_dataset()
    data2 = load_resume_data()

    combined_data = data1 + data2
    print(f"Combined total: {len(combined_data)} samples")

    save_training_data(combined_data)
    print("Training data preparation complete")
 


if __name__ == '__main__':
    main()
