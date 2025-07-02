import mongoose, { Schema } from 'mongoose';

const jobSchema = new Schema(
  {
    requestId: {
      type: String,
      required: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'complete', 'failed'],
      default: 'pending',
      required: true
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: false
    },
    error: {
      type: String,
      required: false
    },
    completedAt: {
      type: Date,
      required: false
    }
  },
  { timestamps: true }
);

jobSchema.index({ requestId: 1 });

export const Job = mongoose.model('Job', jobSchema);
