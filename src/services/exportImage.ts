import { toPng } from 'html-to-image'

export async function downloadNodeAsPng(
  node: HTMLElement,
  fileName: string,
  returnBlob = false,
): Promise<Blob | void> {
  // Find the table element to get its full width
  const table = node.querySelector('table')
  if (!table) {
    // Fallback to regular export if no table found
    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    })
    
    if (returnBlob) {
      const response = await fetch(dataUrl)
      return await response.blob()
    }
    
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`
    link.click()
    return
  }

  // Get the full width of the table (including scrollable content)
  const tableWidth = table.scrollWidth
  
  // Get the container's dimensions
  const containerRect = node.getBoundingClientRect()
  
  // Calculate full dimensions including padding
  const padding = 16 // p-4 = 16px on each side
  const fullWidth = Math.max(containerRect.width, tableWidth + padding * 2)
  const fullHeight = containerRect.height

  // Temporarily remove overflow constraints to capture full width
  const originalOverflow = node.style.overflow
  const originalOverflowX = node.style.overflowX
  const originalOverflowY = node.style.overflowY
  const originalWidth = node.style.width
  
  // Find the scrollable container and temporarily modify it
  const scrollContainer = node.querySelector('.overflow-x-auto')
  let originalScrollOverflow = ''
  let originalScrollWidth = ''
  let originalScrollMaxWidth = ''
  
  if (scrollContainer instanceof HTMLElement) {
    originalScrollOverflow = scrollContainer.style.overflow
    originalScrollWidth = scrollContainer.style.width
    originalScrollMaxWidth = scrollContainer.style.maxWidth
    // Remove overflow and width constraints to show full table
    scrollContainer.style.overflow = 'visible'
    scrollContainer.style.width = 'auto'
    scrollContainer.style.maxWidth = 'none'
  }
  
  // Temporarily expand the node to fit full width
  node.style.overflow = 'visible'
  node.style.width = `${fullWidth}px`

  try {
    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      width: fullWidth,
      height: fullHeight,
    })
    
    if (returnBlob) {
      const response = await fetch(dataUrl)
      return await response.blob()
    }
    
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`
    link.click()
  } finally {
    // Restore original styles
    node.style.overflow = originalOverflow
    node.style.overflowX = originalOverflowX
    node.style.overflowY = originalOverflowY
    node.style.width = originalWidth
    
    if (scrollContainer instanceof HTMLElement) {
      scrollContainer.style.overflow = originalScrollOverflow
      scrollContainer.style.width = originalScrollWidth
      scrollContainer.style.maxWidth = originalScrollMaxWidth
    }
  }
}
