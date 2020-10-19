const iconv = require('iconv-lite');
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const BufferHelper = require('bufferhelper');

/**
 * 请求网站内容
 * @param {String} url 请求链接
 * @return {Promise} data 返回内容
 */
function fetchContent(url) {
  return new Promise((resolve, reject) => {
    var req = request(url, { timeout: 20000, pool: false });
    req.setMaxListeners(50);
    req.setHeader(
      'user-agent',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36'
    );
    req.setHeader('accept', 'text/html,application/xhtml+xml');
    req.on('error', function (err) {
      reject(err);
    });
    req.on('response', function (res) {
      var bufferHelper = new BufferHelper();
      res.on('data', function (chunk) {
        bufferHelper.concat(chunk);
      });
      res.on('end', function () {
        var result = iconv.decode(bufferHelper.toBuffer(), 'GBK');
        resolve(result);
      });
    });
  });
}

/**
 * 获取高校数据
 * @param {String} url 网站链接
 * @return {Promise} data 返回内容
 */
function getUniversityData(url) {
  return new Promise((resolve, reject) => {
    fetchContent(url)
      .then((res) => {
        const $ = cheerio.load(res);
        const $letfInfo = $('.basic_infor li');
        const $rightInfo = ($('.contact p').html() || '')
          .replace(/[\r\n]/g, '')
          .replace(/\\u/g, '%u')
          .split('<br>')
          .map((str) => unescape(str.replace(/&#x/g, '%u').replace(/;/g, '')));
        const rightInfo = arrToParams($rightInfo, /(：|:)/g);
        const bachelor = arrToParams($('.basic_infor li').eq(3).text().replace(/(人|个)/g, '').split(' '), '：');

        // 学校名称
        const name = $('.bg_sez h2')
          .text()
          .replace(/[\r\n\s]|(高校对比)/g, '');
        // logo
        const logo_url = ($('.college_msg img').attr('src') || "").trim();
        // 高校类型
        const type = $letfInfo.eq(0).text().replace('高校类型： ', '').split(' ').join(',').trim();
        // 高校隶属
        const subjection = $letfInfo.eq(1).text().replace('高校隶属于：', '').trim();
        // 高校所在地
        const location = $letfInfo.eq(2).text().replace('高校所在地：', '').trim();
        // 院士
        const academician = bachelor['院士'];
        // 博士点
        const doctor = bachelor['博士点'];
        // 硕士点
        const master = bachelor['硕士点'];
        // 通讯地址
        const address = rightInfo["学校地址"] || rightInfo["通讯地址"] || rightInfo["东区地址"];
        // 联系电话
        const tel = rightInfo["联系电话"] || rightInfo["招生咨询电话"];
        // 电子邮箱
        const email = rightInfo["电子邮箱"];
        // 学校网址
        const url = rightInfo["学校网址"];
        // 招生网址
        const recruit_url = rightInfo["招生网址"];
        // 邮政编码
        const postcode = rightInfo["邮政编码"];

        const info = {
          name,
          logo_url,
          type,
          subjection,
          location,
          address,
          tel,
          email,
          url,
          academician,
          doctor,
          master,
          recruit_url,
          postcode,
        };
        const white_list = ["tel"]
        // 去除// -
        for (const key in info) {
          if (info.hasOwnProperty(key) && white_list.indexOf(key) === -1) {
            info[key] = (info[key] || "").replace(/(-)/g, "")
          }
        }

        resolve(info);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

/**
 * 获取高校表格的数据
 * @param {String} url 网站链接
 * @return {Promise} data 返回内容
 */
function getUniversityFormData(url, num, region, branch) {
  return new Promise((resolve, reject) => {
    fetchContent(url)
      .then((res) => {
        const $ = cheerio.load(res);
        // 学校名称
        const name = $('.bg_sez h2').text();
        let data = [];
         if($('.szw') && $('.sz')){
          const $szw = $('.szw')
          for(var i=0; i< $szw.length; i++){
            const $td = $szw.eq(i).find('td')
              let year = $td.eq(0).text().replace('------', null);
              let minmum = $td.eq(1).text().replace('------', null);;
              let maxmum = $td.eq(2).text().replace('------', null);;
              let average = $td.eq(3).text().replace('------', null);;
              let admitPerson = $td.eq(4).text().replace('------', null);;
              let batch = $td.eq(5).text();
            data.push({year,minmum, maxmum,average, admitPerson,batch,name, schoolid: num, regionid: region, branchid: branch })
          }
          const $sz = $('.sz')
          for(var i=0; i< $sz.length; i++){
            const $td = $sz.eq(i).find('td')
              let year = $td.eq(0).text().replace('------', null);
              let minmum = $td.eq(1).text().replace('------', null);;
              let maxmum = $td.eq(2).text().replace('------', null);;
              let average = $td.eq(3).text().replace('------', null);;
              let admitPerson = $td.eq(4).text().replace('------', null);;
              let batch = $td.eq(5).text();
            data.push({year,minmum, maxmum,average, admitPerson,batch, name, schoolid: num, regionid: region, branchid: branch })
          }  
         }
    
       
        const info = [...data];
        resolve(info);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

/**
 * 数组转对象
 * @param {Array} arr ["院士：75人", "博士点：244个", "硕士点：201个"]
 * @param {String|RegExp} str 切割字符, eg: arr中以“：”切割
 * @return {Object} 返回转换好的对象
 */
function arrToParams(arr, str) {
  const obj = {};
  arr.map((item) => {
    let index = -1;
    if (typeof (str) === "string") {
      index = item.indexOf(str) + 1;
    } else {
      // 正则
      const reg = new RegExp(str)
      reg.test(item)
      index = reg.lastIndex;
    }
    if (index !== -1) {
      obj[item.slice(0, index - 1).trim()] = item.slice(index).trim();
    }
  });
  return obj;
}

/**
 * 更新数据
 * @param {Object} obj 对象
 * @param {String} fileURL 文件地址
 */
function undateJsonFile(obj, fileURL) {
  return new Promise((resolve, reject) => {
    fs.readFile(fileURL, function (err, data) {
      if (err) {
        reject(err);
      }
      const fileData = JSON.parse(data.toString() || '[]');
      // fileData.push(obj);

      fs.writeFile(fileURL, JSON.stringify(fileData.concat(obj)), function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

module.exports = {
  fetchContent,
  getUniversityData,
  undateJsonFile,
  getUniversityFormData,
};
