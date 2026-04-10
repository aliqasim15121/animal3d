// memory-monitor.js - RUN THIS FIRST
const used = process.memoryUsage();
console.log('🚨 MEMORY USAGE:', {
  rss: Math.round(used.rss / 1024 / 1024) + ' MB',
  heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
  heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB',
  external: Math.round(used.external / 1024 / 1024) + ' MB'
});

// Print every 2 seconds
setInterval(() => {
  const used = process.memoryUsage();
  console.log(`[${new Date().toISOString()}] Heap: ${Math.round(used.heapUsed / 1024 / 1024)}MB / ${Math.round(used.heapTotal / 1024 / 1024)}MB`);
}, 2000);

console.log('✅ Memory monitor running. Now start your server...');