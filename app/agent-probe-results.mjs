export function nativeToolFailed(item) {
  return item?.type === 'mcpToolCall' && (item.status === 'failed' || item.error != null || item.result?.isError === true);
}
const csvText = text => typeof text === 'string' ? text.replace(/\r\n/g, '\n').replace(/\n$/, '') : null;
export function exactCsvDelivery(original, message) {
  if (typeof message !== 'string') return false;
  const blocks = [...message.matchAll(/```csv[ \t]*\r?\n([\s\S]*?)\r?\n```/g)];
  return blocks.length === 1 && csvText(original) === csvText(blocks[0][1]);
}
