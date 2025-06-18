Map.centerObject(zone)
Map.addLayer(zone)
var image=landsat.filterDate('2022-12-01','2022-12-31').filterBounds(zone).filterMetadata('CLOUD_COVER','less_than',1)
print(image)
var scene0=ee.ImageCollection(['LANDSAT/LC08/C02/T1_TOA/LC08_202051_20221208'])
var scene1=ee.ImageCollection(['LANDSAT/LC08/C02/T1_TOA/LC08_202051_20221224'])
var scene2=ee.ImageCollection(['LANDSAT/LC08/C02/T1_TOA/LC08_203051_20221215'])

var scene=ee.ImageCollection(['LANDSAT/LC08/C02/T1_TOA/LC08_202051_20221208','LANDSAT/LC08/C02/T1_TOA/LC08_203051_20221215'])
  .mosaic()
  .clipToCollection(zone)
Map.addLayer(scene)
//creation de composition coloree
var composition=scene.select(['B6','B5','B4'])
//Creation de parametre de visualisation
var paramvis={mi:0.0, max:0.4}
//Affichage de l'image
Map.addLayer(composition,paramvis,'image2022')
//Exporter l'image 
Export.image.toDrive({
  image: composition, 
  description: 'Parc Niokolo', 
  region: zone, 
  scale: 30, 
  maxPixels: 1e9,
});
//Calcul du NDVI
var ndvi= composition.normalizedDifference(['B5','B4']).rename ('NDVI')
Map.addLayer (ndvi,{min:-1,max:1, palette:['red','yellow','green']},'NDVI')

//CALCULER L'INDICE DE l'EAU
// Importer une image Landsat 8 (TOA) et la filtrer
var scene = ee.ImageCollection("LANDSAT/LC08/C02/T1_TOA")
    .filterBounds(zone) 
    .filterDate('2022-12-01', '2022-12-31') 
    .median()
    .clip(zone);
print(scene)
// Calcul du NDWI
var ndwi = scene.normalizedDifference(['B3', 'B5']).rename('NDWI');

// Appliquer un masque pour afficher toutes les zones d’eau
var ndwiMasked = ndwi.updateMask(ndwi.gte(0)); 

// Options de visualisation
var ndwiViz = {min: -1, max: 1, palette: ['brown', 'yellow', 'blue']};

// Ajouter à la carte
Map.centerObject(zone, 10);
Map.addLayer(ndwiMasked, ndwiViz, "NDWI Masked");

//Classification supervisee
var bands=['B2','B3','B4','B5']
var zone_entrainement=vegetation.merge(eau).merge(sol_nu).merge(brulis)
var donnees_entrainement=scene.sampleRegions({
  collection:zone_entrainement,
  properties:['CLASS'],
  scale:30
})
var classificateur=ee.Classifier.smileCart().train({
  features:donnees_entrainement,
  classProperty:'CLASS',
  inputProperties:bands
})
var image_classee=scene.classify(classificateur)
Map.addLayer(image_classee,{min:1,max:4,palette:['green','blue','yellow','red']},'Classification')

//Vectoriser l'image
var image_vecteur=image_classee.reduceToVectors({
  geometry:zone, 
  scale:30, 
  geometryType:'polygon', 
  eightConnected:false, 
  labelProperty:'CLASS'
})

//Exporter les resultats
Export.table.toDrive({
  collection:image_vecteur,
  folder:'GEE'
})
