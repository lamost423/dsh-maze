/**
 * 临时诊断探针——诊断层第 7 项（本机会话库）的前置实机验证。
 * 回答调研里标了「必须实机确认」的几个问题：客户端能拿到多少会话行、冷会话 retain 会不会
 * 把 Agent 唤醒（=产生模型调用）、读到的历史是完整还是尾部窗口。
 *
 * 只在 __mazeProbe 被显式调用时工作；验证完从入口摘掉并删除本文件。
 */
export declare function installProbe(ctx: Record<string, any>): void;
//# sourceMappingURL=probe.d.ts.map