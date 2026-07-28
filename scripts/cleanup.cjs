const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/components/trips/TripItinerary.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Remove import PlaceDiscoveryDialog
content = content.replace(/import\s*\{\s*PlaceDiscoveryDialog[^}]*\}\s*from\s*["'].\/planner\/PlaceDiscoveryDialog["'];/g, '');

// 2. Remove DiscoveredPlace import (might be combined)
content = content.replace(/type\s+DiscoveredPlace\s*,?/g, '');

// 3. Remove state variables
content = content.replace(/const\s+\[showPlaceDialog,\s*setShowPlaceDialog\]\s*=\s*useState\(false\);/g, '');
content = content.replace(/const\s+\[isSavingPlace,\s*setIsSavingPlace\]\s*=\s*useState\(false\);/g, '');

// 4. Remove fillFormFromDiscoveredPlace and its handlers
content = content.replace(/const\s+fillFormFromDiscoveredPlace\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*setCategory\([^)]*\);\s*\};/g, '');
content = content.replace(/const\s+handleAddDiscoveredPlaceToDay\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*\};/g, '');
content = content.replace(/const\s+handleSaveDiscoveredPlace\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*?(?=\s*const\s+handleSubmit)/g, '');

// 5. Remove onSearchPlaces={() => setShowPlaceDialog(true)} from ItineraryHero
content = content.replace(/onSearchPlaces=\{\(\)\s*=>\s*setShowPlaceDialog\(true\)\}/g, '');

// 6. Remove the PlaceDiscoveryDialog component render
const dialogRegex = /<PlaceDiscoveryDialog[\s\S]*?\/>/;
content = content.replace(dialogRegex, '');

// 7. Remove buttons triggering it
// This one in particular: <Button variant="outline" onClick={() => setShowPlaceDialog(true)} className="min-h-11">
content = content.replace(/<Button[^>]*onClick=\{\(\)\s*=>\s*setShowPlaceDialog\(true\)\}[^>]*>[\s\S]*?<\/Button>/g, '');

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Done!');
