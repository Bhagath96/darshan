/**
 * Builds CSV text (RFC 4180). Values that a spreadsheet would run as a formula
 * (starting with = + - @) are prefixed with ' so an exported file can't run code
 * when opened in Excel (CSV injection).
 */
export function toCsv(header: string[], rows: Array<Array<string | number>>): string {
  const cell = (value: string | number) => {
    let text = String(value)
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  // Leading BOM so Excel reads UTF-8 (Malayalam names, ₹) correctly.
  return '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

/** Saves text as a file through the browser's normal download. */
export function downloadFile(
  filename: string,
  text: string,
  type = 'text/csv;charset=utf-8',
): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before freeing the memory.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
