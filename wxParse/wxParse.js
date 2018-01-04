/**
 * author: Di (微信小程序开发工程师)
 * organization: WeAppDev(微信小程序开发论坛)(http://weappdev.com)
 *               垂直微信小程序开发交流社区
 *
 * github地址: https://github.com/icindy/wxParse
 *
 * for: 微信小程序富文本解析
 * detail : http://weappdev.com/t/wxparse-alpha0-1-html-markdown/184
 */

/**
 * utils函数引入
 **/
import showdown from './showdown.js';
import HtmlToJson from './html2json.js';
/**
 * 配置及公有属性
 **/
var realWindowWidth = 0;
var realWindowHeight = 0;
wx.getSystemInfo({
  success: function (res) {
    realWindowWidth = res.windowWidth
    realWindowHeight = res.windowHeight
  }
})

const picRectData = {};

/**
 * 主函数入口区
 **/
function wxParse(bindName = 'wxParseData', type='html', data='<div class="color:red;">数据不能为空</div>', target, imagePadding) {
  var that = target;
  var transData = {};//存放转化后的数据
  if (type == 'html') {
    transData = HtmlToJson.html2json(data, bindName);
    // console.log(JSON.stringify(transData, ' ', ' '));
  } else if (type == 'md' || type == 'markdown') {
    var converter = new showdown.Converter();
    var html = converter.makeHtml(data);
    transData = HtmlToJson.html2json(html, bindName);
    // console.log(JSON.stringify(transData, ' ', ' '));
  }
  transData.view = {};
  transData.view.imagePadding = 0;
  if(typeof(imagePadding) != 'undefined'){
    transData.view.imagePadding = imagePadding
  }
  resolvePicData(transData, that, bindName);
  var bindData = {};
  bindData[bindName] = transData;
  that.setData(bindData)
  that.wxParseImgLoad = wxParseImgLoad;
  that.wxParseImgTap = wxParseImgTap;
}
// 图片点击事件
function wxParseImgTap(e) {
  var that = this;
  var nowImgUrl = e.target.dataset.src;
  var tagFrom = e.target.dataset.from;
  var temData = readData(that.data, tagFrom) || {};
  if (typeof (tagFrom) != 'undefined' && tagFrom.length > 0) {
    wx.previewImage({
      current: nowImgUrl, // 当前显示图片的http链接
      urls: temData.imageUrls || [] // 需要预览的图片http链接列表
    })
  }
}

/**
 * 图片视觉宽高计算函数区
 **/
function wxParseImgLoad(e) {
  var that = this;
  var tagFrom = e.target.dataset.from;
  var idx = e.target.dataset.idx;
  if (typeof (tagFrom) != 'undefined' && tagFrom.length > 0) {
    calMoreImageInfo(e, idx, that, tagFrom)
  }
}
// 假循环获取计算图片视觉最佳宽高
function calMoreImageInfo(e, idx, that, bindName) {
  var temData = readData(that.data, bindName);
  if (!temData || temData.images.length == 0) {
    return;
  }
  var temImages = temData.images;
  // 因为无法获取view宽度 需要自定义padding进行计算，稍后处理
  var recal = wxAutoImageCal(e.detail.width, e.detail.height, temData);
  // temImages[idx].width = recal.imageWidth;
  // temImages[idx].height = recal.imageheight;
  // temData.images = temImages;
  // var bindData = {};
  // bindData[bindName] = temData;
  // that.setData(bindData);

  const src = e.target.dataset.src;
  picRectData[src] = {
    width: e.detail.width,
    height: e.detail.height
  };

  var index = temImages[idx].index
  var key = `${bindName}`
  for (var i of index.split('.')) key+=`.nodes[${i}]`
  var keyW = key + '.width'
  var keyH = key + '.height'
  that.setData({
    [keyW]: recal.imageWidth,
    [keyH]: recal.imageheight,
    [`${key.showImg}`]: true
  })
}

// 计算视觉优先的图片宽高
function wxAutoImageCal(originalWidth, originalHeight, temData = {}) {
  // 获取图片的原始长宽
  var windowWidth = 0, windowHeight = 0;
  var autoWidth = 0, autoHeight = 0;
  var results = {};

  var padding = (temData.view || {}).imagePadding || 0;
  windowWidth = realWindowWidth - (2 * padding);
  windowHeight = realWindowHeight;
  // 判断按照那种方式进行缩放
  // console.log("windowWidth" + windowWidth);
  if (originalWidth > windowWidth) { // 在图片width大于手机屏幕width时候
    autoWidth = windowWidth;
    // console.log("autoWidth" + autoWidth);
    autoHeight = (autoWidth * originalHeight) / originalWidth;
    // console.log("autoHeight" + autoHeight);
    results.imageWidth = autoWidth;
    results.imageheight = autoHeight;
  } else { // 否则展示原来的数据
    results.imageWidth = originalWidth;
    results.imageheight = originalHeight;
  }
  return results;
}

function wxParseTemArray(temArrayName,bindNameReg,total,that){
  var array = [];
  var temData = that.data;
  var obj = null;
  for(var i = 0; i < total; i++){
    var simArr = temData[bindNameReg+i].nodes;
    array.push(simArr);
  }

  temArrayName = temArrayName || 'wxParseTemArray';
  obj = JSON.parse('{"'+ temArrayName +'":""}');
  obj[temArrayName] = array;
  that.setData(obj);
}

/**
 * 配置emojis
 *
 */

function emojisInit(reg='',baseSrc="/wxParse/emojis/",emojis){
   HtmlToJson.emojisInit(reg,baseSrc,emojis);
}

// 递归读取 data
// 新增
function readData(source, key = '') {
  if (!key) {
    return null;
  }

  if (key[0] === '.') {
    key = key.slice(1);
  }

  const keyArray = key.split('.');
  let result = source;
  for (let i = 0; i < keyArray.length; i ++) {
    result = result[keyArray[i]];

    if (!result) break;
  }

  return result;
}

function resolvePicData(transData, that, bindName) {
  const temImages = transData.images;
  if (!temImages) {
    return;
  }

  temImages.forEach((imgData, index) => {
    if (!picRectData[imgData.attr.src]) {
      return;
    }

    let key = '';
    for (var i of imgData.index.split('.')) key +=`.nodes.${i}`;

    const picOriginRectData = picRectData[imgData.attr.src];
    const nodeData = readData(transData, key) || {};
    const rectData = wxAutoImageCal(picOriginRectData.width, picOriginRectData.height, transData);
    nodeData.width = rectData.imageWidth;
    nodeData.height = rectData.imageheight;
    nodeData.showImg = true;
    // 设置宽高
    // nodeData.width = 1;
    // nodeData.height = 1;
    // nodeData.showImg = true;
  });
}

module.exports = {
  wxParse: wxParse,
  wxParseTemArray:wxParseTemArray,
  emojisInit:emojisInit
}


