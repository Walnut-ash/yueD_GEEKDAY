
const key = "e2b299832ff8fcf586e100ca5e8d1dab";
const url = `https://restapi.amap.com/v3/place/text?keywords=KFC&city=Beijing&extensions=all&key=${key}`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log("Status:", data.status);
    console.log("Info:", data.info);
    if (data.pois && data.pois.length > 0) {
      console.log("First POI Name:", data.pois[0].name);
      console.log("First POI Address:", data.pois[0].address);
      console.log("First POI BizExt:", JSON.stringify(data.pois[0].biz_ext));
    } else {
      console.log("No POIs found");
    }
  })
  .catch(err => console.error("Error:", err));
