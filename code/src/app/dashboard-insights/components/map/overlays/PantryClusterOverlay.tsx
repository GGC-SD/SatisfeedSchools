"use client";

import { useEffect } from "react";
import maplibregl, {
  Map as MLMap,
  MapLayerMouseEvent,
  MapGeoJSONFeature,
} from "maplibre-gl";
import { db } from "@/firebase/firebaseConfig";
import { collection, getDocs, query } from "firebase/firestore";

import {
  replaceFixedRadiusFromCenter,
  clearFixedRadius,
  PolygonFeature,
} from "./click-radius";


