"use client";

import DataCard from "../ui/data-card";
import SearchableDropdown from "../filters/searchable-dropdown";
import DashboardSchoolsMap, { DashboardSchoolsMapHandle } from "../map/dashboard-schools-map";
import { useCallback, useRef, useState, useEffect } from "react";
import { getFirestore, collection, query, getDocs } from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig"
//import { SchoolRecord } from "@/data/schoolTypes";
import CountyStatsCard from "../ui/county-stats-card";
import * as turf from "@turf/turf";