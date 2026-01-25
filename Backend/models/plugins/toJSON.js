export default function toJSON(schema) {
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_, ret) => {
      // Frontend expects `id`
      ret.id = ret.publicId || String(ret._id);
      delete ret._id;
      delete ret.publicId;
      return ret;
    },
  });
}