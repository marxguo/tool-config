// http://oa.en-plus.com.cn:8090/api/hrm/kq/grouplocation/getLocationWifiInfo
let obj = JSON.parse($response.body);

obj = {
  "wifiInfo" : {
    "wifis" : [

    ],
    "wificheck" : true
  },
  "status" : "1",
  "locationInfo" : {
    "locationcheckscope" : "300",
    "locations" : [
      {
        "address" : "松白路1026号未来科学城6栋2-3层",
        "checkscope" : "100",
        "groupid" : "1",
        "id" : "1",
        "longitude" : "113.933159",
        "locationname" : "深圳驿普乐氏科技有限公司",
        "latitude" : "22.635843"
      }
    ],
    "locationcheck" : false
  }
};

$done({body: JSON.stringify(obj)});
