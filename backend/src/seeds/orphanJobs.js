import Job from "../models/job.model.js";
import Application from "../models/application.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

/**
 * Data repair for jobs whose `postedBy` user no longer exists.
 *
 * When a poster account is deleted, its jobs keep pointing at the old _id.
 * Populating them yields `postedBy: null`, nobody can manage the job or see
 * its applicants, and chat with applicants breaks. `adoptOrphanJobs` hands
 * every such job to `newPosterId`, along with everything keyed on the old
 * recruiter:
 *   - jobs.postedBy
 *   - applications.recruiterId (messaging authorises against this)
 *   - messages.senderId / receiverId, and conversationId, which embeds the
 *     recruiter's id, rebuilt so existing chat threads stay together
 *
 * Idempotent: once nothing is orphaned, it changes nothing.
 */

export function findOrphanJobs(jobs, existingUserIds) {
  const known = new Set([...existingUserIds].map(String));
  return jobs.filter((job) => !job.postedBy || !known.has(String(job.postedBy)));
}

/** Rewrites one message so the deleted recruiter is replaced by `newPosterId`. */
export function reassignMessage(message, orphanIds, newPosterId) {
  const orphan = new Set([...orphanIds].map(String));
  const newId = String(newPosterId);
  const sender = orphan.has(String(message.senderId)) ? newId : String(message.senderId);
  const receiver = orphan.has(String(message.receiverId)) ? newId : String(message.receiverId);

  if (sender === String(message.senderId) && receiver === String(message.receiverId)) return null;

  const applicantId = sender === newId ? receiver : sender;
  return {
    senderId: sender,
    receiverId: receiver,
    conversationId: Message.createConversationId(message.jobId, applicantId, newId),
  };
}

export async function adoptOrphanJobs(newPosterId) {
  if (!newPosterId) throw new Error("adoptOrphanJobs needs the id of the poster who will own the jobs");

  const userIds = (await User.find({}, "_id").lean()).map((u) => u._id);
  const jobs = await Job.find({}, "_id postedBy").lean();
  const orphans = findOrphanJobs(jobs, userIds);

  if (orphans.length === 0) {
    return { jobs: 0, applications: 0, messages: 0 };
  }

  const jobIds = orphans.map((j) => j._id);
  const orphanPosterIds = [...new Set(orphans.map((j) => j.postedBy).filter(Boolean).map(String))];

  const jobResult = await Job.updateMany({ _id: { $in: jobIds } }, { $set: { postedBy: newPosterId } });
  const appResult = await Application.updateMany({ jobId: { $in: jobIds } }, { $set: { recruiterId: newPosterId } });

  const messages = await Message.find(
    { jobId: { $in: jobIds }, $or: [{ senderId: { $in: orphanPosterIds } }, { receiverId: { $in: orphanPosterIds } }] },
    "_id jobId senderId receiverId"
  ).lean();

  const ops = messages
    .map((m) => ({ m, update: reassignMessage(m, orphanPosterIds, newPosterId) }))
    .filter(({ update }) => update)
    .map(({ m, update }) => ({ updateOne: { filter: { _id: m._id }, update: { $set: update } } }));

  if (ops.length) await Message.bulkWrite(ops);

  return {
    jobs: jobResult.modifiedCount,
    applications: appResult.modifiedCount,
    messages: ops.length,
    previousPosterIds: orphanPosterIds,
  };
}

export default { findOrphanJobs, reassignMessage, adoptOrphanJobs };
