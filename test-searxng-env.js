// 测试SearXNG环境变量自动启用
import { getEnvSearxngEnabled } from "./src/lib/env.js";

// 模拟环境变量
process.env.NEXT_PUBLIC_SEARXNG_URL = "https://searx-test.example.com";

// 测试SearXNG是否自动启用
const isEnabled = getEnvSearxngEnabled();
console.log("SearXNG is automatically enabled:", isEnabled);
console.log("URL:", process.env.NEXT_PUBLIC_SEARXNG_URL);

// 测试当URL为空时的情况
process.env.NEXT_PUBLIC_SEARXNG_URL = "";
const isEnabledEmpty = getEnvSearxngEnabled();
console.log("SearXNG with empty URL:", isEnabledEmpty);

// 测试当 NEXT_PUBLIC_SEARXNG_ENABLED=true 时的情况
process.env.NEXT_PUBLIC_SEARXNG_ENABLED = "true";
const isEnabledExplicit = getEnvSearxngEnabled();
console.log("SearXNG with ENABLED=true:", isEnabledExplicit);

// 输出测试结果
console.log("\nTest Result:",
  isEnabled === true &&
  isEnabledEmpty === false &&
  isEnabledExplicit === true ?
  "PASSED ✅" : "FAILED ❌");
