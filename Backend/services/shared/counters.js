import Counter from "../../models/Counter.model.js";

/**
 * Atomic, collision-safe sequence generator (the standard MongoDB
 * auto-increment pattern) — replaces the fragile "countDocuments()+1, loop
 * while exists()" pattern used previously for publicId generation, which is
 * (a) not atomic under concurrent requests (two requests can read the same
 * count before either creates its record), and (b) blind to soft-deleted
 * records still occupying a publicId slot (softDelete-plugin queries exclude
 * them from both the count and the existence check), which was the root
 * cause of E11000 duplicate-key errors on publicId.
 *
 * @param {string} name — counter document id, e.g. "appointment", "patient"
 * @param {() => Promise<number>} computeSeed — called ONCE, only the first
 *   time this counter is used, to find the true starting point (typically
 *   the highest existing numeric suffix already in use, including
 *   soft-deleted records, so we never hand out a number that collides).
 * @returns {Promise<number>} the next number in the sequence
 */
export async function getNextSequence(name, computeSeed) {
  let doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true }
  );

  if (!doc) {
    // First-ever call for this counter — bootstrap it from the true current
    // max. If two requests race to bootstrap at once, the loser's create()
    // just throws a duplicate-key error, which we swallow — the counter
    // exists either way by the time we reach the atomic increment below.
    const seed = await computeSeed();
    try {
      await Counter.create({ _id: name, seq: seed });
    } catch {
      // lost the bootstrap race — fine, another request created it first
    }
    doc = await Counter.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
  }

  return doc.seq;
}
