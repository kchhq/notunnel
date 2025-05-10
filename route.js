export function drawRoute(
  map,
  startLng, startLat, // ✅ 경도, 위도
  endLng, endLat,     // ✅ 경도, 위도
  option = "0",
  setPolylineCallback = () => {}
) {
  const startX = startLng.toString(); // Tmap은 경도
  const startY = startLat.toString(); // Tmap은 위도
  const endX = endLng.toString();
  const endY = endLat.toString();

  fetch("https://apis.openapi.sk.com/tmap/routes?version=1&format=json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "appKey": "i21eBayOYj3UmtuIrwnnuaRfBIXFN5Fx9sQyQeIE"
    },
    body: JSON.stringify({
      startX,
      startY,
      endX,
      endY,
      reqCoordType: "WGS84GEO",
      resCoordType: "WGS84GEO",
      searchOption: option
    })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.features || data.features.length === 0) {
        alert("경로를 찾을 수 없습니다. 위치를 다시 설정해보세요.");
        return;
      }

      const linePath = [];

      data.features.forEach(f => {
        if (f.geometry.type === "LineString") {
          f.geometry.coordinates.forEach(coord => {
            linePath.push(new kakao.maps.LatLng(coord[1], coord[0])); // 위도, 경도 순
          });
        }
      });

      const polyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 4,
        strokeColor: "#FF6600",
        strokeOpacity: 0.8,
        strokeStyle: "solid",
        map
      });

      setPolylineCallback(polyline);
    })
    .catch(err => {
      console.error("Tmap 경로 탐색 오류:", err);
      alert("경로 탐색 중 오류가 발생했습니다.");
    });
}
