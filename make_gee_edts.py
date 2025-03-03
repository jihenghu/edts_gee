import sys
import ee
import pandas as pd
ee.Authenticate()
ee.Initialize(project='ed2-metero-driver')

## receive a year as an argument
year = int(sys.argv[1])  

i_date = f'{year}-01-01'
f_date = f'{year+1}-01-01'

u_lon = 4.8148
u_lat = 45.7758
u_poi = ee.Geometry.Point(u_lon, u_lat)
# i_date = '2010-01-01'
# f_date = '2010-12-31'

# Import the NASA MERRA land surface data collection.
slv = ee.ImageCollection('NASA/GSFC/MERRA/slv/2')
# slv = slv.select('T10M',).filterDate(i_date, f_date)
slv = slv.select('PS', 'QV10M', 'T10M', 'U50M', 'V50M').filterDate(i_date, f_date)
scale = 50000  # scale in meters

lst_u_poi = slv.getRegion(u_poi, scale).getInfo()

def ee_array_to_df(arr, list_of_bands):
    """Transforms client-side ee.Image.getRegion array to pandas.DataFrame."""
    df = pd.DataFrame(arr)

    # Rearrange the header.
    headers = df.iloc[0]
    df = pd.DataFrame(df.values[1:], columns=headers)

    # Remove rows without data inside.
    df = df[['longitude', 'latitude', 'time', *list_of_bands]].dropna()

    # Convert the data to numeric values.
    for band in list_of_bands:
        df[band] = pd.to_numeric(df[band], errors='coerce')

    # Convert the time field into a datetime.
    df['datetime'] = pd.to_datetime(df['time'], unit='ms')

    # Keep the columns of interest.
    df = df[['time','datetime',  *list_of_bands]]

    return df

# lst_df_urban = ee_array_to_df(lst_u_poi,['T10M'])
lst_df_urban = ee_array_to_df(lst_u_poi,['PS', 'QV10M', 'T10M', 'U50M', 'V50M'])

# save to csv file  
df = ee_array_to_df(lst_u_poi, ['PS', 'QV10M', 'T10M', 'U50M', 'V50M'])
df.to_csv(f'urbansite_data_{year}.csv', index=False)