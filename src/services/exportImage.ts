import { toPng } from 'html-to-image'

export async function downloadNodeAsPng(
  node: HTMLElement,
  fileName: string,
  returnBlob = false,
): Promise<Blob | void> {
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  })
  
  if (returnBlob) {
    // Convert data URL to blob
    const response = await fetch(dataUrl)
    return await response.blob()
  }
  
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`
  link.click()
}
