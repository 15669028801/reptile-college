const fs = require("fs");
const { getUniversityData, undateJsonFile, getUniversityFormData } = require("./utils")


// 最大高校id
const MAX_ID = 2667;

// 开始id
let num = 2265;

// 最大招生地区
const Max_region = 31;

// 开始地区
let region = 20;
 
// 最大文理分科
const MAX_branch = 2;

// 开始文理分科
let branch = 2;

// const REQ_URL = "http://college.gaokao.com/school/" 
const REQ_URL = "http://college.gaokao.com/school/tinfo/"  // http://college.gaokao.com/school/tinfo/1/result/39/10/

function getData(url) {
  getUniversityFormData(`${url}${num}/result/${region}/${branch}/`, num, region, branch).then((res) => {
    if (branch === 1 && region === 1) {
      console.log(`录入第${num}数据（${new Date().toTimeString()}）：${(res[0] || {}).name}  `);
    }
    // console.log(`${num}-${region}-${branch}`)
    undateJsonFile(res, "./data.json").then(() => {
      if(branch === MAX_branch && region === Max_region && num === MAX_ID){
        console.log("数据扒取结束！！！！！")
        return
      }
      // 文理科
      branch++;
      if (branch > MAX_branch) {
        branch = 1; region++;
      }
      if (region > Max_region) {
        region = 1; num++;
      }
      getData(url)
    })
  }).catch((err) => {
    if (String(err).indexOf("TIMEDOUT" !== -1)) {
      console.log("..................请求超时，重试请求..................");
      // console.log(err);
      setTimeout(() => {
        getData(url)
      }, 3600);
    } else {
      console.error("爬取出错")
      console.log(err)
    }
  })

}

getData(REQ_URL)