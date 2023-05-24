// http://oa.en-plus.com.cn:8090/api/hrm/kq/grouplocation/getLocationWifiInfo
let obj = JSON.parse($response.body);

obj = {
  "wifiInfo" : {
    "wifiInfo": {
        "wifis": [],
        "wificheck": true
    },
    "locationInfo": {
        "locationcheckscope": "300",
        "locations": [
            {
                "checkscope": "100",
                "locationname": "深圳驿普乐氏科技有限公司",
                "address": "松白路1026号未来科学城6栋2-3层",
                "latitude": "22.635843",
                "groupid": "1",
                "id": "1",
                "longitude": "113.933159"
            }
        ],
        "locationcheck": false
    },
    "status": "1"
};

$done({body: JSON.stringify(obj)});
