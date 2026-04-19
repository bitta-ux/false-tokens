figma.showUI(__html__, { width: 380, height: 600 });

// Function to check if a color is using design tokens
function isUsingColorToken(paint, node, paintType = 'fill') {
  try {
    if (paint.type === 'SOLID') {
      // Check if the paint has a bound variable (modern design tokens/variables)
      if (paint.boundVariables && 
          (paint.boundVariables.color || paint.boundVariables.opacity)) {
        return true;
      }
      
      // Check if paint has a styleId (published/local styles)
      if (paint.styleId && paint.styleId !== '') {
        return true;
      }
      
      // Check node style IDs as fallback
      if (paintType === 'fill' && node && 'fillStyleId' in node) {
        const hasFillStyle = node.fillStyleId && node.fillStyleId !== '';
        if (hasFillStyle) {
          return true;
        }
      }
      
      if (paintType === 'stroke' && node && 'strokeStyleId' in node) {
        const hasStrokeStyle = node.strokeStyleId && node.strokeStyleId !== '';
        if (hasStrokeStyle) {
          return true;
        }
      }
      
      return false;
    }
    return false;
  } catch (e) {
    console.log('Error in isUsingColorToken:', e);
    return false;
  }
}

// Function to check if text is using design tokens
function isUsingTextToken(node) {
  try {
    return node.textStyleId !== '';
  } catch (e) {
    console.log('Error checking text token:', e);
    return false;
  }
}

// Function to check if a node is effectively visible
function isNodeVisible(node) {
  try {
    // Check if node has visible property and if it's false
    if ('visible' in node && node.visible === false) {
      return false;
    }
    
    // Check if node has opacity and if it's 0
    if ('opacity' in node && node.opacity === 0) {
      return false;
    }
    
    // For paint properties, check if they're marked as not visible
    // This will be handled per-paint in the main checking function
    
    // Check if any parent in the hierarchy is hidden
    let current = node.parent;
    while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
      if ('visible' in current && current.visible === false) {
        return false;
      }
      if ('opacity' in current && current.opacity === 0) {
        return false;
      }
      current = current.parent;
    }
    
    return true;
  } catch (e) {
    console.log('Error checking node visibility:', e);
    return true; // Default to visible if we can't determine
  }
}

// Function to convert RGB to hex
function rgbToHex(r, g, b) {
  const rHex = Math.round(r * 255).toString(16).padStart(2, '0');
  const gHex = Math.round(g * 255).toString(16).padStart(2, '0');
  const bHex = Math.round(b * 255).toString(16).padStart(2, '0');
  return '#' + rHex + gHex + bHex;
}

// Function to get element hierarchy path
function getElementPath(node) {
  const path = [];
  let current = node;
  
  while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
    if (current.name) {
      path.unshift(current.name);
    }
    current = current.parent;
  }
  
  return path.length > 3 ? ['...', ...path.slice(-2)] : path;
}

// Enhanced function to get current search scope
function getSearchScope() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 1) {
    const selectedNode = selection[0];
    const nodeType = selectedNode.type;
    const nodeName = selectedNode.name || 'Unnamed';
    
    if (['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP', 'SECTION'].includes(nodeType)) {
      return {
        type: nodeType.toLowerCase(),
        nodes: [selectedNode],
        description: `${nodeType}: ${nodeName}`,
        icon: nodeType === 'FRAME' ? '🖼️' : 
              nodeType === 'COMPONENT' ? '🧩' : 
              nodeType === 'INSTANCE' ? '📋' : 
              nodeType === 'GROUP' ? '📁' : '📄'
      };
    } else {
      return {
        type: 'element',
        nodes: [selectedNode],
        description: `${nodeType}: ${nodeName}`,
        icon: '🎯'
      };
    }
  } else if (selection.length > 1) {
    return {
      type: 'multiple',
      nodes: selection,
      description: `${selection.length} selected elements`,
      icon: '🎯'
    };
  } else {
    return {
      type: 'page',
      nodes: [figma.currentPage],
      description: `Current page: ${figma.currentPage.name}`,
      icon: '📄'
    };
  }
}

// Enhanced function to find elements without tokens
function findElementsWithoutTokens(searchScope, mode, includeHidden = false) {
  const elementsWithoutTokens = [];
  let processedNodes = 0;
  let skippedHiddenNodes = 0;
  const maxNodes = 10000;
  
  function checkNode(node) {
    try {
      processedNodes++;
      
      // Skip document and page nodes
      if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
        return;
      }

      // Additional safety checks
      if (!node || node.removed === true) {
        return;
      }
      
      // Check if node is effectively visible (only if includeHidden is false)
      const nodeIsVisible = isNodeVisible(node);
      if (!includeHidden && !nodeIsVisible) {
        skippedHiddenNodes++;
        return;
      }
      
      const elementPath = getElementPath(node);
      
      if (mode === 'color') {
        // Check fills
        if ('fills' in node && node.fills !== figma.mixed && Array.isArray(node.fills)) {
          const fills = node.fills;
          for (let i = 0; i < fills.length; i++) {
            const fill = fills[i];
            // Check if this specific fill is visible (or if we're including hidden elements)
            if (fill && fill.type === 'SOLID' && (includeHidden || fill.visible !== false) && fill.color) {
              if (!isUsingColorToken(fill, node, 'fill')) {
                const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
                elementsWithoutTokens.push({
                  id: node.id,
                  name: node.name || 'Unnamed',
                  type: node.type,
                  property: 'fill',
                  color: hex.toUpperCase(),
                  path: elementPath,
                  fillIndex: i,
                  isHidden: !nodeIsVisible || fill.visible === false,
                  timestamp: Date.now()
                });
              }
            }
          }
        }
        
        // Check strokes
        if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
          for (let i = 0; i < node.strokes.length; i++) {
            const stroke = node.strokes[i];
            // Check if this specific stroke is visible (or if we're including hidden elements)
            if (stroke && stroke.type === 'SOLID' && (includeHidden || stroke.visible !== false) && stroke.color) {
              if (!isUsingColorToken(stroke, node, 'stroke')) {
                const hex = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
                elementsWithoutTokens.push({
                  id: node.id,
                  name: node.name || 'Unnamed',
                  type: node.type,
                  property: 'stroke',
                  color: hex.toUpperCase(),
                  path: elementPath,
                  strokeIndex: i,
                  isHidden: !nodeIsVisible || stroke.visible === false,
                  timestamp: Date.now()
                });
              }
            }
          }
        }
      } else if (mode === 'text') {
        // Check text styles
        if (node.type === 'TEXT') {
          if (!isUsingTextToken(node)) {
            // Get text properties for display
            let fontSize = 'Mixed';
            let fontFamily = 'Mixed';
            let fontWeight = 'Mixed';
            
            try {
              if (typeof node.fontSize === 'number') {
                fontSize = node.fontSize + 'px';
              }
              if (typeof node.fontName === 'object' && node.fontName.family) {
                fontFamily = node.fontName.family;
                fontWeight = node.fontName.style || 'Regular';
              }
            } catch (e) {
              // Mixed formatting - keep defaults
            }
            
            elementsWithoutTokens.push({
              id: node.id,
              name: node.name || 'Unnamed',
              type: node.type,
              property: 'text-style',
              path: elementPath,
              fontSize: fontSize,
              fontFamily: fontFamily,
              fontWeight: fontWeight,
              isHidden: !nodeIsVisible,
              timestamp: Date.now()
            });
          }
        }
      }
      
    } catch (error) {
      console.warn('Skipping node due to error:', (node && node.name) || (node && node.type) || 'unknown', error.message);
      // Don't throw - just skip this node and continue
    }
  }
  
  function traverseNodes(nodes) {
    const queue = [...nodes];
    
    while (queue.length > 0 && processedNodes < maxNodes) {
      const node = queue.shift();
      
      // Check this node
      checkNode(node);
      
      // Add children to queue
      if ('children' in node && Array.isArray(node.children)) {
        // If we're not including hidden elements and this node is hidden, 
        // we can skip its entire subtree for performance
        if (!includeHidden && !isNodeVisible(node)) {
          // Count all descendants as skipped
          const countDescendants = (n) => {
            let count = 1;
            if ('children' in n && Array.isArray(n.children)) {
              for (const child of n.children) {
                count += countDescendants(child);
              }
            }
            return count;
          };
          skippedHiddenNodes += countDescendants(node) - 1; // -1 because we already counted the node itself
        } else {
          // Process children normally
          queue.push(...node.children);
        }
      }
      
      // Log progress
      if (processedNodes % 1000 === 0) {
        console.log(`Processed ${processedNodes} nodes, found ${elementsWithoutTokens.length} issues, skipped ${skippedHiddenNodes} hidden nodes...`);
      }
    }
    
    return processedNodes < maxNodes;
  }
  
  try {
    console.log('Starting scan in scope:', searchScope.description);
    console.log('Mode:', mode);
    console.log('Include hidden:', includeHidden);
    
    traverseNodes(searchScope.nodes);
    
    console.log('Scan completed. Processed', processedNodes, 'nodes. Found', elementsWithoutTokens.length, 'elements without tokens. Skipped', skippedHiddenNodes, 'hidden nodes.');
    
    if (processedNodes >= maxNodes) {
      console.warn('Scan stopped due to node limit. Results may be incomplete.');
    }
    
  } catch (error) {
    console.error('Scan failed:', error);
    return {
      results: [],
      error: 'Scan interrupted: ' + error.message + '. Try selecting a smaller area or frame.',
      processedNodes: 0,
      skippedHiddenNodes: 0
    };
  }
  
  return {
    results: elementsWithoutTokens,
    processedNodes: processedNodes,
    skippedHiddenNodes: skippedHiddenNodes,
    searchScope: searchScope,
    limited: processedNodes >= maxNodes,
    includeHidden: includeHidden
  };
}

// Function to check if the original issue still exists
async function checkIfIssuePersists(node, resultData) {
  try {
    if (!node || !resultData) return true; // Default to "still broken" if we can't check
    
    const mode = resultData.mode;
    const property = resultData.property;
    
    if (mode === 'color') {
      if (property === 'fill') {
        // Check fills
        if ('fills' in node && node.fills !== figma.mixed && Array.isArray(node.fills)) {
          const fillIndex = resultData.fillIndex || 0;
          const fill = node.fills[fillIndex];
          
          if (fill && fill.type === 'SOLID') {
            // Check if this fill is now using a token
            return !isUsingColorToken(fill, node, 'fill');
          }
        }
      } else if (property === 'stroke') {
        // Check strokes
        if ('strokes' in node && Array.isArray(node.strokes)) {
          const strokeIndex = resultData.strokeIndex || 0;
          const stroke = node.strokes[strokeIndex];
          
          if (stroke && stroke.type === 'SOLID') {
            // Check if this stroke is now using a token
            return !isUsingColorToken(stroke, node, 'stroke');
          }
        }
      }
    } else if (mode === 'text') {
      // Check text styles
      if (node.type === 'TEXT') {
        return !isUsingTextToken(node);
      }
    }
    
    return true; // Default to "still broken"
  } catch (e) {
    console.log('Error checking if issue persists:', e);
    return true; // Default to "still broken" on error
  }
}

// Listen for selection changes to update the scope
figma.on('selectionchange', () => {
  const scope = getSearchScope();
  
  figma.ui.postMessage({
    type: 'scope-updated',
    scope: scope
  });
});

// Listen for current page changes
figma.on('currentpagechange', () => {
  const scope = getSearchScope();
  
  figma.ui.postMessage({
    type: 'scope-updated',
    scope: scope
  });
});

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get-initial-data') {
    console.log('Getting initial data...');
    
    const scope = getSearchScope();
    
    figma.ui.postMessage({
      type: 'initial-data',
      scope: scope
    });
  }

  if (msg.type === 'scan-tokens') {
    console.log('Starting token scan for mode:', msg.mode, 'includeHidden:', msg.includeHidden);
    
    // Use setTimeout to prevent blocking the UI
    setTimeout(() => {
      try {
        const scope = getSearchScope();
        const scanResult = findElementsWithoutTokens(scope, msg.mode, msg.includeHidden);
        
        figma.ui.postMessage({
          type: 'scan-results',
          results: scanResult.results || [],
          mode: msg.mode,
          processedNodes: scanResult.processedNodes,
          skippedHiddenNodes: scanResult.skippedHiddenNodes,
          searchScope: scanResult.searchScope || scope,
          error: scanResult.error,
          limited: scanResult.limited,
          includeHidden: scanResult.includeHidden
        });
      } catch (error) {
        console.error('Scan error:', error);
        figma.ui.postMessage({
          type: 'error',
          message: 'Scan failed: ' + error.message
        });
      }
    }, 100);
  }

  if (msg.type === 'navigate-to-node') {
    try {
      let node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Element not found');
      
      // Check if the issue is still present before navigating
      if (msg.resultData) {
        const isStillBroken = await checkIfIssuePersists(node, msg.resultData);
        
        if (!isStillBroken) {
          // Issue was fixed! Send success message instead of navigating
          figma.ui.postMessage({
            type: 'issue-fixed',
            nodeName: node.name || 'Unnamed',
            resultData: msg.resultData
          });
          return;
        }
      }
      
      // Issue still exists or no result data, proceed with normal navigation
      // Find containing page
      let targetPage = node;
      while (targetPage && targetPage.type !== 'PAGE') {
        targetPage = targetPage.parent;
      }
      if (!targetPage) throw new Error('Page not found for element');
      
      // Switch to correct page first
      if (targetPage.id !== figma.currentPage.id) {
        figma.currentPage = targetPage;
        // Re-fetch node after page switch
        node = await figma.getNodeByIdAsync(msg.nodeId);
      }
      
      // Select and scroll into view
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
      
      figma.ui.postMessage({
        type: 'navigation-success',
        nodeName: node.name || 'Unnamed',
        pageName: targetPage.name
      });
    } catch (err) {
      figma.ui.postMessage({
        type: 'error',
        message: err.message
      });
    }
  }

  if (msg.type === 'close-plugin') {
    figma.closePlugin();
  }
};