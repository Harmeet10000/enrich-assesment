export const config = {
  vendorRateLimits: {
    syncVendor: { max: 5, duration: 1000 },
    asyncVendor: { max: 3, duration: 1000 }
  },
  vendorProcessingTimes: {
    syncVendor: { min: 500, max: 1500 },
    asyncVendor: { min: 2000, max: 4000 }
  }
};
