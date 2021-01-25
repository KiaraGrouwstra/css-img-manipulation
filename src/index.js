#!/usr/bin/env node
const pug = require('pug');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const im = require('imagemagick');
const CDP = require('chrome-remote-interface');
const tmp = require('tmp');
const resolve = path.resolve;

program
  .usage('[options]')
  .option('-s, --css <path>', 'stylesheet path')
  .option('-c, --cls <str>', 'class name, default filter')
  .option('-i, --img <path>', 'image path')
  .option('-o, --out <path>', 'image out path, default: override --img!')
  .option('-q, --quality <number>', 'quality, default 1.0')
  .option('-r, --rotate', 'whether to rotate height/width')
program.parse(process.argv);

global.cls = program.cls || 'filter';
global.css = resolve(program.css || './style.css');
global.img = resolve(program.img || './image.png');
var out = resolve(program.out || global.img);
var quality = program.quality || 0.9;
var rotate = program.rotate;

var options = {pretty:true, globals:['global']};
var fn = pug.compileFile(`${__dirname}/filter.pug`, options);
const tmpFile = tmp.fileSync({ postfix: '.html' });
// var htmlPath = `${__dirname}/filter.html`;
var htmlPath = tmpFile.name;
// console.debug(htmlPath);
fs.writeFileSync(htmlPath, fn(options));

im.identify(global.img, function(err, features){
  if (err) throw err;
  // var {width, height} = features;
  var width  = rotate ? features.height : features.width;
  var height = rotate ? features.width  : features.height;

  // source: https://jonathanmh.com/taking-full-page-screenshots-headless-chrome/
  const screenshotDelay = 2000; // ms
  CDP(async function(client){
    const {DOM, Emulation, Network, Page, Runtime} = client;
  
    // Enable events on domains we are interested in.
    await Page.enable();
    await DOM.enable();
    await Network.enable();
  
    // change these for your tests or make them configurable via argv
    var device = {
      width,
      height,
      deviceScaleFactor: 0,
      mobile: false,
      fitWindow: false
    };
  
    // set viewport and visible size
    await Emulation.setDeviceMetricsOverride(device);
    await Emulation.setVisibleSize({width, height});
  
    await Page.navigate({url: `file://${htmlPath}`});
  
    Page.loadEventFired(async() => {
      const {root: {nodeId: documentNodeId}} = await DOM.getDocument();
      const {nodeId: bodyNodeId} = await DOM.querySelector({
        selector: 'body',
        nodeId: documentNodeId,
      });
  
      const {model: {height}} = await DOM.getBoxModel({nodeId: bodyNodeId});
      await Emulation.setVisibleSize({width, height});
      await Emulation.setDeviceMetricsOverride({width, height, screenWidth: width, screenHeight: height, deviceScaleFactor: 1, fitWindow: false, mobile: false});
      await Emulation.setPageScaleFactor({pageScaleFactor:1});
    });
  
    setTimeout(async function() {
      const screenshot = await Page.captureScreenshot({format: "png", fromSurface: true});
      const buffer = new Buffer.from(screenshot.data, 'base64');
      fs.writeFile(out, buffer, 'base64', function(err) {
        if (err) {
          console.error(err);
        } else {
          // console.log('Screenshot saved');
          // compress
          im.crop({
            srcPath: out,
            dstPath: out,
            width,
            height,
            quality,
          }, function (err, stdout, stderr){
            if (err) return console.error(err.stack || err);
          });
        }
      });
        client.close();
    }, screenshotDelay);
  
  }).on('error', err => {
    console.error('Cannot connect to browser:', err);
  });
  
});

