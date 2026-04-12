/**
 * @file ai.ts
 * @description AI 引擎封装模块 — 统一导出 HuggingFace 和 OpenAI 图像生成函数
 * 该模块是 ai-engines.ts 的公共入口，符合项目文件规范
 */

export {
  generateWithHuggingFace,
  generateWithOpenAI,
  generateImage,
  STYLE_PROMPTS,
  STYLE_OPTIONS,
} from './ai-engines'

export type { AIEngine, StyleOption, GenerateResult } from './ai-engines'
