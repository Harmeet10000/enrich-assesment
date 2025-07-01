export const config = {
  vendorRateLimits: {
    syncVendor: { max: 5, duration: 1000 }, // 5 requests per second
    asyncVendor: { max: 3, duration: 1000 } // 3 requests per second
  },
  // Mock vendor processing times (in milliseconds)
  vendorProcessingTimes: {
    syncVendor: { min: 500, max: 1500 }, // 0.5 to 1.5 seconds
    asyncVendor: { min: 2000, max: 4000 } // 2 to 4 seconds for initial ack, then webhook
  }
};
