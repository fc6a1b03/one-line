// 测试SearXNG环境变量自动启用

// 模拟环境变量
process.env.NEXT_PUBLIC_SEARXNG_URL = "https://searx-test.example.com";
process.env.NEXT_PUBLIC_SEARXNG_ENABLED = "";

// 导入要测试的函数
import { getEnvSearxngEnabled } from "./src/lib/env";

function runTest() {
  // 测试1: 当NEXT_PUBLIC_SEARXNG_URL设置时，应该自动启用
  const isEnabled = getEnvSearxngEnabled();
  console.log("[Test 1] SearXNG is automatically enabled:", isEnabled);
  console.log("URL:", process.env.NEXT_PUBLIC_SEARXNG_URL);

  // 测试2: 当URL为空时，不应该启用
  process.env.NEXT_PUBLIC_SEARXNG_URL = "";
  const isEnabledEmpty = getEnvSearxngEnabled();
  console.log("[Test 2] SearXNG with empty URL:", isEnabledEmpty);

  // 测试3: 当NEXT_PUBLIC_SEARXNG_ENABLED=true时，应该启用
  process.env.NEXT_PUBLIC_SEARXNG_ENABLED = "true";
  const isEnabledExplicit = getEnvSearxngEnabled();
  console.log("[Test 3] SearXNG with ENABLED=true:", isEnabledExplicit);

  // 测试结果
  const passed = isEnabled === true && isEnabledEmpty === false && isEnabledExplicit === true;
  console.log("\nTest Result:", passed ? "PASSED ✅" : "FAILED ❌");

  return passed;
}

runTest();
