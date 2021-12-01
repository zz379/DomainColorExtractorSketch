import sketch from 'sketch';
import BrowserWindow from 'sketch-module-web-view';

// 调用 webview 中的全局方法
// browserWindow.webContents
//     .executeJavaScript('webviewLog("hello")')
//     .then(res => {
//         // do something with the result
//     })

// export default function(context) {

export default function onRun(context) {
    const browserWindow = sketch.webView;
    // 接收 webview 中的消息事件
    browserWindow.webContents
        .on('extractImageData', function(i) {
            checkSelectedLayers(browserWindow);
        })
        .on('copyResult', function(result) {
            sketch.UI.message(result ? '复制成功' : '复制失败，请手动复制');
        });
    // 加载插件页面
    browserWindow.loadURL(require('../resources/ui.html'));
}

export function onSetUp(context) {
    // 恢复插件上次移动后的坐标
    const Settings = sketch.Settings;
    let x = Settings.settingForKey('main_color_extractor_position_x');
    let y = Settings.settingForKey('main_color_extractor_position_y');
    // console.log("BrowserWindow X=" + x + " Y=" + y);

    sketch.webView = new BrowserWindow({
        width: 240,
        height: 251,
        resizable: false,
        movable: false,
        alwaysOnTop: true,
        maximizable: false,
        minimizable: false
    });
    if (x != undefined && y != undefined) {
        sketch.webView.setPosition(x, y, false);
    }
}

export function onTearDown(context) {
    // 保存插件移动后的坐标
    const position = sketch.webView.getPosition();
    // console.log("BrowserWindow X=" + position[0] + " Y=" + position[1]);
    const Settings = sketch.Settings;
    Settings.setSettingForKey('main_color_extractor_position_x', position[0]);
    Settings.setSettingForKey('main_color_extractor_position_y', position[1]);
    sketch.webView.destroy();
}

function checkSelectedLayers(browserWindow) {
    let selectedDocument = sketch.getSelectedDocument();
    // 判断选中的图层的数量
    let selection = selectedDocument.selectedLayers;
    if (selection.isEmpty || selection.length != 1) {
        sketch.UI.message('Please select only one layer');
        return;
    }
    // 判断选中的图层是否是图片图层
    let layer = selection.layers[0];
    if (!layer.image) {
        sketch.UI.message('Please select the image layer');
        return;
    }

    // layer = layer.resizeToOriginalSize();

    // sketch.UI.message('准备获取图片数据');
    // ImageData 是原生 NSImage的包装器
    let imageData = layer.image;
    // return a native NSImage
    // let nsimage = imageData.nsimage;
    // return a native NSData representation of the image
    let nsdata = imageData.nsdata;
    // { width: 100, height: 100 }
    // let imageSize = imageData.size;
    // console.log("图片大小：width = " + imageSize.width + " height = " + imageSize.height);
    // NSData 转换成 Byte 
    // let imageBytes = nsdata.bytes();
    console.log("图片数据：" + nsdata);
    let base64String = nsdata.base64EncodedStringWithOptions(0);
    console.log("图片数据：" + base64String);
    let commandStr = 'extractColorFromImageData("' + base64String + '")';
    browserWindow.webContents.executeJavaScript(commandStr);
}