// Define the region of interest (ROI)
var wlon = -45;
var elon = -44.8;
var slat = -21;
var nlat = -20;
var roi = ee.Geometry.Rectangle([wlon, slat, elon, nlat]);

// Define the time range
var startDate = ee.Date('2010-01-01');
var endDate = ee.Date('2010-12-31');

// Create a list of dates at hourly intervals
var dateSequence = ee.List.sequence({
  start: startDate.millis(),
  end: endDate.millis(),
  step: 1000 * 60 * 60 // 1 hour in milliseconds
});

// Function to process each date
var processDate = function(dateMillis) {
  var date = ee.Date(dateMillis);
  var dateString = date.format('YYYY-MM-dd HH:mm:ss');

  // Print the current datetime being processed
  console.log('Processing:', dateString);

  // Load the MERRA-2 datasets for the specific date
  var flux = ee.ImageCollection('NASA/GSFC/MERRA/flx/2')
    .filterDate(date, date.advance(1, 'hour'))
    .select(['NIRDF', 'NIRDR', 'PRECTOTCORR']);

  var rad = ee.ImageCollection('NASA/GSFC/MERRA/rad/2')
    .filterDate(date, date.advance(1, 'hour'))
    .select(['EMIS', 'LWGAB', 'LWGEM', 'LWGNT']);

  var lnd = ee.ImageCollection('NASA/GSFC/MERRA/lnd/2')
    .filterDate(date, date.advance(1, 'hour'))
    .select(['PARDFLAND', 'PARDRLAND']);

  var slv = ee.ImageCollection('NASA/GSFC/MERRA/slv/2')
    .filterDate(date, date.advance(1, 'hour'))
    .select(['PS', 'QV10M', 'T10M', 'U50M', 'V50M']);

  // Merge all the collections into one
  var merra2 = flux.combine(rad).combine(lnd).combine(slv);

  // Calculate the mean of each image over the ROI
  var calculateRegionalMean = function(image) {
    var meanDict = image.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: roi,
      scale: 5000,  // Adjust the scale according to the dataset resolution
      maxPixels: 1e13
    });
    return image.set(meanDict);
  };

  // Map the function over the merged collection
  var merra2Means = merra2.map(calculateRegionalMean);

  // Convert the collection to a list of dictionaries
  var merra2List = merra2Means.toList(merra2Means.size());

  // Extract the first image (since there should only be one image per hour)
  var image = ee.Image(merra2List.get(0));

  // Get the mean values as a dictionary
  var meanValues = image.toDictionary();

  // Add the date to the dictionary
  meanValues = meanValues.set('date', dateString);

  // Return the feature with the mean values and date
  return ee.Feature(null, meanValues);
};

// Map the function over the list of dates
var timeSeries = ee.FeatureCollection(dateSequence.map(processDate));

// Print the time series
print('Time Series:', timeSeries);

// Export the time series as a CSV file
Export.table.toDrive({
  collection: timeSeries,
  description: 'MERRA2_Hourly_TimeSeries',
  fileFormat: 'CSV'
});