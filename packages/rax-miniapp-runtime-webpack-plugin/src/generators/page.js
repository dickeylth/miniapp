const { join } = require('path');
const { platformMap } = require('miniapp-builder-shared');

const getAssetPath = require('../utils/getAssetPath');
const getSepProcessedPath = require('../utils/getSepProcessedPath');
const addFileToCompilation = require('../utils/addFileToCompilation');
const { pathHelper: { getBundlePath }} = require('miniapp-builder-shared');
const { RECURSIVE_TEMPLATE_TYPE } = require('../constants');

function generatePageCSS(
  compilation,
  pageRoute,
  subAppRoot = '',
  { target, command }
) {
  let pageCssContent = '/* required by usingComponents */\n';
  const pageCssPath = `${pageRoute}${platformMap[target].extension.css}`;
  const subAppCssPath = `${getBundlePath(subAppRoot)}.css${platformMap[target].extension.css}`;
  if (compilation.assets[subAppCssPath]) {
    pageCssContent += `@import "${getAssetPath(subAppCssPath, pageCssPath)}";`;
  }


  addFileToCompilation(compilation, {
    filename: pageCssPath,
    content: pageCssContent,
    target,
    command,
  });
}

function generatePageJS(
  compilation,
  pageRoute,
  pagePath,
  nativeLifeCyclesMap = {},
  commonPageJSFilePaths = [],
  subAppRoot = '',
  { target, command, pluginDir, outputPath }
) {
  const renderPath = getAssetPath('render', pageRoute);
  const route = getSepProcessedPath(pagePath);
  const nativeLifeCycles = `[${Object.keys(nativeLifeCyclesMap).reduce((total, current, index) => index === 0 ? `${total}'${current}'` : `${total},'${current}'`, '')}]`;
  const init = `
function init(window, document) {${commonPageJSFilePaths.map(filePath => `require('${getAssetPath(filePath, pageRoute)}')(window, document)`).join(';')}}`;

  const pageJsContent = `
const render = require('${renderPath}');
${init}
Page(render.createPageConfig('${route}', ${nativeLifeCycles}, init, '${subAppRoot}'))`;

  addFileToCompilation(compilation, {
    filename: `${pageRoute}.js`,
    content: pageJsContent,
    target,
    command,
  });
}

function generatePageXML(
  compilation,
  pageRoute,
  useComponent,
  { target, command, outputPath }
) {
  let pageXmlContent;
  if (RECURSIVE_TEMPLATE_TYPE.has(target) && useComponent) {
    pageXmlContent = '<element r="{{root}}"  />';
  } else {
    const rootTmplFileName = `root${platformMap[target].extension.xml}`;
    const pageTmplFilePath = `${pageRoute}${platformMap[target].extension.xml}`;
    pageXmlContent = `<import src="${getAssetPath(join(outputPath, rootTmplFileName), join(outputPath, pageTmplFilePath))}"/>
<template is="RAX_TMPL_ROOT_CONTAINER" data="{{r: root}}"  />`;
  }

  addFileToCompilation(compilation, {
    filename: `${pageRoute}${platformMap[target].extension.xml}`,
    content: pageXmlContent,
    target,
    command,
  });
}

function generatePageJSON(
  compilation,
  pageConfig,
  useComponent,
  usingComponents, usingPlugins,
  pageRoute,
  { target, command }
) {
  if (!pageConfig.usingComponents) {
    pageConfig.usingComponents = {};
  }

  if (useComponent || !RECURSIVE_TEMPLATE_TYPE.has(target)) {
    pageConfig.usingComponents.element = getAssetPath('comp', pageRoute);
  }

  Object.keys(usingComponents).forEach(component => {
    pageConfig.usingComponents[component] = getAssetPath(usingComponents[component].path, pageRoute);
  });
  Object.keys(usingPlugins).forEach(plugin => {
    pageConfig.usingComponents[plugin] = usingPlugins[plugin].path;
  });

  addFileToCompilation(compilation, {
    filename: `${pageRoute}.json`,
    content: JSON.stringify(pageConfig, null, 2),
    target,
    command,
  });
}

module.exports = {
  generatePageCSS,
  generatePageJS,
  generatePageJSON,
  generatePageXML
};
