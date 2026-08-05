/**
 * Soft-delete plugin — additive `deletedAt` field + a query-level filter
 * applied ONCE at the schema, not scattered across every controller/service
 * call site. Every existing `Model.find()`, `findOne()`, `findById()`,
 * `countDocuments()`, and `aggregate()` call across the codebase
 * automatically excludes soft-deleted documents without being touched.
 *
 * To see soft-deleted documents on purpose (e.g. an admin "show deleted"
 * view), opt in explicitly:
 *   Model.find({...}).setOptions({ includeDeleted: true })
 *   Model.aggregate([...]).option({ includeDeleted: true })
 *
 * To delete/restore a document:
 *   await doc.softDelete();   // sets deletedAt = now, saves
 *   await doc.restore();      // clears deletedAt, saves
 */
const FIND_METHODS = ["find", "findOne", "findOneAndUpdate", "countDocuments", "count"];

export default function softDeletePlugin(schema) {
  schema.add({ deletedAt: { type: Date, default: null, index: true } });

  FIND_METHODS.forEach((method) => {
    schema.pre(method, function () {
      if (this.getOptions().includeDeleted) return;
      const filter = this.getFilter();
      if (filter.deletedAt === undefined) {
        this.where({ deletedAt: null });
      }
    });
  });

  schema.pre("aggregate", function () {
    if (this.options?.includeDeleted) return;
    this.pipeline().unshift({ $match: { deletedAt: null } });
  });

  schema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
  };
}
