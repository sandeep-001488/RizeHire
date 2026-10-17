import { test } from "node:test";
import assert from "node:assert/strict";
import { findOrphanJobs, reassignMessage, extendExpiredDeadlines } from "./orphanJobs.js";
import Message from "../models/message.model.js";

const OLD = "693dcc0bcfc73927e1e0a75f";
const NEW = "6a0000000000000000000001";
const APPLICANT = "6a0000000000000000000002";
const JOB = "6a0000000000000000000003";

test("findOrphanJobs flags jobs whose poster is missing or null, keeps the rest", () => {
  const jobs = [
    { _id: "a", postedBy: OLD },
    { _id: "b", postedBy: NEW },
    { _id: "c", postedBy: null },
  ];
  assert.deepEqual(findOrphanJobs(jobs, [NEW, APPLICANT]).map((j) => j._id), ["a", "c"]);
  assert.deepEqual(findOrphanJobs(jobs, [NEW, OLD]).map((j) => j._id), ["c"]);
});

test("reassignMessage swaps the deleted recruiter and rebuilds the conversation id", () => {
  const fromRecruiter = reassignMessage({ jobId: JOB, senderId: OLD, receiverId: APPLICANT }, [OLD], NEW);
  assert.equal(fromRecruiter.senderId, NEW);
  assert.equal(fromRecruiter.receiverId, APPLICANT);
  assert.equal(fromRecruiter.conversationId, Message.createConversationId(JOB, APPLICANT, NEW));

  const toRecruiter = reassignMessage({ jobId: JOB, senderId: APPLICANT, receiverId: OLD }, [OLD], NEW);
  assert.equal(toRecruiter.receiverId, NEW);
  assert.equal(toRecruiter.conversationId, fromRecruiter.conversationId, "both directions must land in one thread");
});

test("reassignMessage leaves unrelated messages alone", () => {
  assert.equal(reassignMessage({ jobId: JOB, senderId: NEW, receiverId: APPLICANT }, [OLD], NEW), null);
});

test("extendExpiredDeadlines is a no-op for missing or non-positive days", async () => {
  assert.deepEqual(await extendExpiredDeadlines(undefined), { jobs: 0 });
  assert.deepEqual(await extendExpiredDeadlines("0"), { jobs: 0 });
  assert.deepEqual(await extendExpiredDeadlines("abc"), { jobs: 0 });
});
