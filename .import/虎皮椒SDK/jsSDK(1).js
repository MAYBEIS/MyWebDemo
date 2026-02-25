const { formatResponse, nowDate, uuid } = require('../../utils/tools');
const axios = require('axios');
const md5 = require('md5');

function getHash(params, appSecret) {
  const sortedParams = Object.keys(params)
    .filter(key => params[key] && key !== 'hash') //过滤掉空值和hash本身
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  const stringSignTemp = sortedParams + appSecret;
  const hash = md5(stringSignTemp);
  return hash;
}

async function wxPay(options) {
  //发起支付的函数，直接写在发起支付的接口里面
  const params = {
    version: '1.1',
    appid: '填写虎皮椒的APPID', //填写虎皮椒的APPID
    trade_order_id: options.order_id, //商户订单号
    total_fee: options.money, //金额，最多两位小数
    title: options.title,
    time: nowDate(), //Math.floor(new Date().valueOf() / 1000);
    notify_url: `${options.backendUrl}/wxnotify`, //通知回调网址,直接写一个通知接口,POST请求
    nonce_str: uuid(), //随机值 Date.now().toString(16).slice(0, 6) + '-' + Math.random().toString(16).slice(2, 8);
    type: 'WAP',
    wap_url: 'http://www.xunhupay.com',
    wap_name: 'http://www.xunhupay.com',
  };
  const hash = getHash(params, '这个地方改成虎皮椒对应的key');
  // 发送 POST 请求
  const requestParams = new URLSearchParams({
    ...params,
    hash,
  });
  axios
    .post('https://api.xunhupay.com/payment/do.html ', requestParams, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    .then(response => {
      // 处理响应
      console.log('Response:', response.data);
    })
    .catch(error => {
      // 处理错误
      console.error('Error:', error);
    });
}
// wxPay({
//   order_id: 1,
//   money: 1,
//   title: 'test',
//   backendUrl: 'http://fyxyw.top',
// });

router.post('/wxnotify', async (ctx, next) => {
  //回调通知的接口  这个post请求，传入的参数是formData格式 自己选择中间件处理，本人用的是koa框架，使用其他的框架也是差不多的
  try {
    const data = ctx.request.body || {};
    const appSecret = '这个地方改成虎皮椒对应的key';
    console.log(data);
    //验签
    if (data.hash !== getHash(data, appSecret)) {
      console.log('验签失败');
      ctx.body = 'success';
      return;
    }
    if (data.status === 'OD') {
      console.log('支付成功');
      // if (订单未处理) {
      // 一般会再发起支付的时候把订单存数据库，这个地方根据订单号查询数据库
      // 如果订单还没有处理 就处理下，如果已经处理就不要处理了
      // }
    } else {
      //处理订单未支付成功的情况
    }
    ctx.body = 'success';
  } catch (e) {
    ctx.body = formatResponse(false, e);
  }
});

module.exports = { wxPay };
