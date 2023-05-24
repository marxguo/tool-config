// http://oa.en-plus.com.cn:8090/api/hrm/kq/attendanceButton/getOutButtons
let obj = JSON.parse($response.body);

obj = {
  "isrange" : "1",
  "status" : "1",
  "locationid" : "",
  "rangename" : "EN+",
  "rangekey" : "wifi",
  "outsidesign" : "0"
};
  
$done({body: JSON.stringify(obj)});
