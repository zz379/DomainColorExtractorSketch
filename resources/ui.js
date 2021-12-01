import './style.js';
import Clipboard from 'clipboard';

const SELECTED_TIPS_NO = '请选择要取色的图片';
const SELECTED_TIPS_YES = '请选择要取色的图片，点击按钮取色';
const SELECTED_TIPS_ERROR = '未能正确获取到主色';

var tvSelectedTips = document.getElementById('text_selected_tip');
var btnExtractColor = document.getElementById('extractColor');

var tvResultColorHex = document.getElementById('result_hex');
var tvResultColorRGBR = document.getElementById('result_rgb_r');
var tvResultColorRGBG = document.getElementById('result_rgb_g');
var tvResultColorRGBB = document.getElementById('result_rgb_b');

// 初始化页面元素
tvSelectedTips.innerHTML = SELECTED_TIPS_YES;
btnExtractColor.disabled = false;
tvResultColorHex.hidden = true;
tvResultColorRGBR.hidden = true;
tvResultColorRGBG.hidden = true;
tvResultColorRGBB.hidden = true;

// 按钮点击事件
btnExtractColor.onclick = () => {
    parent.postMessage('extractImageData', 0);
}

// 复制结果
new Clipboard('#result_hex', {
        text: function() {
            return tvResultColorHex.innerHTML;
        }
    })
    .on('success', function(e) {
        toastCopyResult(true);
    })
    .on('error', function(e) {
        toastCopyResult(false);
    });
new Clipboard('#result_rgb_r', {
        text: function() {
            return tvResultColorRGBR.innerHTML.length > 2 ? tvResultColorRGBR.innerHTML.substr(2) : tvResultColorRGBR.innerHTML;
        }
    })
    .on('success', function(e) {
        toastCopyResult(true);
    })
    .on('error', function(e) {
        toastCopyResult(false);
    });
new Clipboard('#result_rgb_g', {
        text: function() {
            return tvResultColorRGBG.innerHTML.length > 2 ? tvResultColorRGBG.innerHTML.substr(2) : tvResultColorRGBG.innerHTML;
        }
    })
    .on('success', function(e) {
        toastCopyResult(true);
    })
    .on('error', function(e) {
        toastCopyResult(false);
    });
new Clipboard('#result_rgb_b', {
        text: function() {
            return tvResultColorRGBB.innerHTML.length > 2 ? tvResultColorRGBB.innerHTML.substr(2) : tvResultColorRGBB.innerHTML;
        }
    })
    .on('success', function(e) {
        toastCopyResult(true);
    })
    .on('error', function(e) {
        toastCopyResult(false);
    });

function toastCopyResult(result) {
    parent.postMessage('copyResult', result);
}

// 切换按钮状态
function changeButtonState(enable) {
    if (enable) {
        tvSelectedTips.innerHTML = SELECTED_TIPS_YES;
        btnExtractColor.disabled = false;
    } else {
        tvSelectedTips.innerHTML = SELECTED_TIPS_NO;
        btnExtractColor.disabled = true;
    }
}

function showMainColor(result) {
    if (!result || result.length != 3) {
        tvSelectedTips.innerHTML = SELECTED_TIPS_ERROR;
        return;
    }
    tvResultColorHex.hidden = false;
    tvResultColorHex.innerHTML = parseRGBToHex(result);
    tvResultColorRGBR.hidden = false;
    tvResultColorRGBG.hidden = false;
    tvResultColorRGBB.hidden = false;
    tvResultColorRGBR.innerHTML = 'R:' + result[0];
    tvResultColorRGBG.innerHTML = 'G:' + result[1];
    tvResultColorRGBB.innerHTML = 'B:' + result[2];
}

function parseRGBToHex(src) {
    var i = 0;
    var result = "#";
    while (i < src.length) {
        var item = src[i];
        var dstColor = item.toString(16).toUpperCase();
        if (dstColor.length < 2) {
            dstColor = "0" + dstColor;
        }
        result = result + dstColor;
        i++;
    }
    return result;
}

window.extractColorFromImageData = message => {
    const url = "data:image/png;base64," + message;
    new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject();
            img.src = url;
        })
        .then((image) => {
            let result = getMainColor(image);
            showMainColor(result);
        })
        .catch(() => {

        });
    return true
}

const maxlen = 100;

function getMainColor(image) {
    console.log('图片宽高：width = ' + image.naturalWidth + ' height = ' + image.naturalHeight);
    // 缩放图片
    const maxlength = Math.max(image.naturalWidth, image.naturalHeight);
    if (maxlength > maxlen) {
        var scale = parseInt(maxlength * 1.0 / maxlen + 0.5);
        image.width = parseInt(image.naturalWidth / scale);
        image.height = parseInt(image.naturalHeight / scale);
    }
    // 获取主色
    var colorThief = new ColorThief();
    let result = colorThief.getColor(image, 1);
    return result;
}

// ******************************************************************************************************
import quantize from '../node_modules/quantize/quantize';
import core from './core.js';

/*
 * Color Thief v2.3.2
 * by Lokesh Dhakar - http://www.lokeshdhakar.com
 *
 * Thanks
 * ------
 * Nick Rabinowitz - For creating quantize.js.
 * John Schulz - For clean up and optimization. @JFSIII
 * Nathan Spady - For adding drag and drop support to the demo page.
 *
 * License
 * -------
 * Copyright Lokesh Dhakar
 * Released under the MIT license
 * https://raw.githubusercontent.com/lokesh/color-thief/master/LICENSE
 *
 * @license
 */


/*
  CanvasImage Class
  Class that wraps the html image element and canvas.
  It also simplifies some of the canvas context manipulation
  with a set of helper functions.
*/

const CanvasImage = function(image) {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.width = this.canvas.width = image.width;
    this.height = this.canvas.height = image.height;
    console.log('图片宽高：width = ' + this.width + ' height = ' + this.height);
    this.context.drawImage(image, 0, 0, this.width, this.height);
};

CanvasImage.prototype.getImageData = function() {
    return this.context.getImageData(0, 0, this.width, this.height);
};

var ColorThief = function() {};

/*
 * getColor(sourceImage[, quality])
 * returns {r: num, g: num, b: num}
 *
 * Use the median cut algorithm provided by quantize.js to cluster similar
 * colors and return the base color from the largest cluster.
 *
 * Quality is an optional argument. It needs to be an integer. 1 is the highest quality settings.
 * 10 is the default. There is a trade-off between quality and speed. The bigger the number, the
 * faster a color will be returned but the greater the likelihood that it will not be the visually
 * most dominant color.
 *
 * */
ColorThief.prototype.getColor = function(sourceImage, quality = 10) {
    const palette = this.getPalette(sourceImage, 2, quality);
    console.log("调色板 palette = " + palette)
    const dominantColor = palette[0];
    return dominantColor;
};


/*
 * getPalette(sourceImage[, colorCount, quality])
 * returns array[ {r: num, g: num, b: num}, {r: num, g: num, b: num}, ...]
 *
 * Use the median cut algorithm provided by quantize.js to cluster similar colors.
 *
 * colorCount determines the size of the palette; the number of colors returned. If not set, it
 * defaults to 10.
 *
 * quality is an optional argument. It needs to be an integer. 1 is the highest quality settings.
 * 10 is the default. There is a trade-off between quality and speed. The bigger the number, the
 * faster the palette generation but the greater the likelihood that colors will be missed.
 *
 *
 */
ColorThief.prototype.getPalette = function(sourceImage, colorCount, quality) {
    const options = core.validateOptions({
        colorCount,
        quality
    });

    // Create custom CanvasImage object
    const image = new CanvasImage(sourceImage);
    const imageData = image.getImageData();
    const pixelCount = image.width * image.height;
    console.log("像素数：" + imageData.data.length);
    console.log("数组大小：" + pixelCount + " 像素数：" + pixelCount * 3);

    const pixelArray = core.createPixelArray(imageData.data, pixelCount, options.quality);
    console.log('有效数组大小：' + pixelArray.length + " 像素数：" + pixelArray.length * 3);

    // Send array to quantize function which clusters values
    // using median cut algorithm
    const cmap = quantize(pixelArray, options.colorCount);
    const palette = cmap ? cmap.palette() : null;

    return palette;
};