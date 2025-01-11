/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, MapView, MapViewRef, ShapeSource, SymbolLayer, SymbolLayerStyle } from '@maplibre/maplibre-react-native';
import * as GeoJSON from 'geojson';

const OVERPASS_API = 'https://overpass.openstreetmap.jp/api/interpreter';

const styles = StyleSheet.create({
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bottonContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  button: {
    width: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  buttonItem: {
    textAlign: 'center',
  },
  tagInfoView: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: 10,
    borderRadius: 10,
  },
});

const toiletStyle: SymbolLayerStyle = {
  iconImage: 'toilets',
  iconSize: 1,
  iconAllowOverlap: true,
};

interface Tag {
  [key: string]: string;
}

function App(): React.JSX.Element {
  const mapRef = useRef<MapViewRef>(null);
  const [toilet, setToilet] = useState<GeoJSON.FeatureCollection<GeoJSON.Point>>({
    type: 'FeatureCollection',
    features: [],
  });
  const [tagInfo, setTagInfo] = useState<Tag | null>(null);
  const parseJson = (json: any): GeoJSON.FeatureCollection<GeoJSON.Point> => {
    const features = json.elements.map((element: any) => {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [element.lon, element.lat],
        },
        properties: {
          id: element.id,
          tags: element.tags,
        },
      };
    });
    return {
      type: 'FeatureCollection',
      features: features,
    };
  };

  const fetchToilet = async () => {
    if (!mapRef.current) {
      return;
    }
    const map = mapRef.current;
    const bounds = await map.getVisibleBounds();
    const south = bounds[1][1];
    const west = bounds[1][0];
    const north = bounds[0][1];
    const east = bounds[0][0];
    const body = `
      [out:json];
      (
      node
        [amenity=toilets]
        (${south},${west},${north},${east});
      node
        ["toilets:wheelchair"=yes]
        (${south},${west},${north},${east});
      );
      out;
    `;
    const options = {
      method: 'POST',
      body: body,
    };
    try {
      const response = await fetch(OVERPASS_API, options);
      const json = await response.json();
      const featureCollection = parseJson(json);
      setToilet(featureCollection);
    } catch (error) {
      console.error(error);
    }
  };

  const onPress = (feature: GeoJSON.Feature) => {
    if (mapRef.current) {
      const map = mapRef.current;
      const screenPointX = feature.properties?.screenPointX;
      const screenPointY = feature.properties?.screenPointY;
      if (screenPointX && screenPointY) {
        map.queryRenderedFeaturesAtPoint([screenPointX, screenPointY], undefined, ['toilet']).then((features) => {
          if (features.features.length > 0) {
            const f = features.features[0];
            const tags = f.properties?.tags;
            if (tags) {
              setTagInfo(tags);
            } else {
              setTagInfo(null);
            }
          } else {
            setTagInfo(null);
          }
        });
      }
    }
  };

  return (
    <View style={styles.main}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapStyle="https://tile.openstreetmap.jp/styles/openmaptiles/style.json"
        logoEnabled={false}
        zoomEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
        onPress={onPress}
      >
        <Camera
          zoomLevel={15}
          centerCoordinate={[139.7673068, 35.681167]}
          animationDuration={2000} />
        <ShapeSource
          id="toilet"
          shape={toilet} />
        <SymbolLayer
          id="toilet"
          sourceID="toilet"
          style={toiletStyle}
        />
      </MapView>
      <View style={styles.bottonContainer}>
        <TouchableOpacity
          onPress={fetchToilet}
          style={styles.button}>
          <Text style={styles.buttonItem}>トイレを検索</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tagInfoView}>
        {tagInfo && Object.keys(tagInfo).map((key) => {
          return (
            <Text key={key}>{key}: {tagInfo[key]}</Text>
          );
        })}
      </View>
    </View>
  );
}

export default App;
