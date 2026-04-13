/**
 * @file ai.ts
 * @description AI 引擎封装模块 — 统一导出所有 AI 图像生成函数
 * 该模块是 ai-engines.ts 的公共入口，符合项目文件规范
 */

export {
  generateImage,
  STYLE_PROMPTS,
  STYLE_OPTIONS,
  ENGINE_OPTIONS,
  QUALITY_OPTIONS,
} from './ai-engines'

export type { AIEngine, StyleOption, EngineOption, GenerateResult, ImageQuality, QualityOption } from './ai-engines'
