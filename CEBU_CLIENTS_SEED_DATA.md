# Cebu Clients Seed Data

To populate your database with Cebu-based commercial establishments and hotels, you can manually add these clients through the web interface's "Add Client" dialog, or run the following SQL in your Supabase SQL Editor:

```sql
-- Clear existing clients (optional)
-- DELETE FROM clients WHERE id IS NOT NULL;

-- Insert Cebu clients with latitude/longitude data
INSERT INTO clients (name, industry, address, mt_requirement, collection_days, collection_shift, latitude, longitude, qr_code) VALUES
('Ayala Center Cebu', 'Shopping Mall', 'Cebu Business Park, Cebu City', 8.5, ARRAY['Mon', 'Wed', 'Fri'], 'AM', 10.3181, 123.9059, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('SM City Cebu', 'Shopping Mall', 'North Reclamation Area, Cebu City', 12.0, ARRAY['Tue', 'Thu', 'Sat'], 'AM', 10.3115, 123.9183, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Radisson Blu Cebu', 'Hotel', 'Serging Osmena Blvd, Cebu City', 4.2, ARRAY['Mon', 'Wed', 'Fri'], 'PM', 10.3156, 123.8919, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Marco Polo Plaza Cebu', 'Hotel', 'Nivel Hills, Cebu City', 5.5, ARRAY['Tue', 'Thu', 'Sat'], 'AM', 10.3252, 123.8952, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Shangri-La Mactan Resort', 'Hotel', 'Punta Engaño, Lapu-Lapu City', 6.8, ARRAY['Mon', 'Thu'], 'PM', 10.3106, 124.0289, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Crimson Resort & Spa Mactan', 'Hotel', 'Seascapes Resort Town, Mactan', 5.2, ARRAY['Wed', 'Sat'], 'AM', 10.3025, 124.0194, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Waterfront Cebu City Hotel', 'Hotel', 'Salinas Drive, Lahug, Cebu City', 4.8, ARRAY['Tue', 'Fri'], 'PM', 10.3315, 123.8953, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('IT Park Food Court Area', 'Commercial Complex', 'Apas, Cebu City', 7.5, ARRAY['Mon', 'Wed', 'Fri'], 'AM', 10.3245, 123.9058, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Robinsons Galleria Cebu', 'Shopping Mall', 'General Maxilom Ave, Cebu City', 9.2, ARRAY['Tue', 'Thu', 'Sat'], 'PM', 10.3196, 123.8951, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('JCentre Mall', 'Shopping Mall', 'AS Fortuna St, Mandaue City', 6.5, ARRAY['Mon', 'Wed'], 'AM', 10.3353, 123.9479, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Parkmall Mandaue', 'Shopping Mall', 'Ouano Ave, Mandaue City', 8.8, ARRAY['Tue', 'Fri'], 'PM', 10.3211, 123.9555, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Quest Hotel Cebu', 'Hotel', 'Archbishop Reyes Ave, Cebu City', 3.5, ARRAY['Mon', 'Thu'], 'AM', 10.3153, 123.9009, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Cebu Grand Hotel', 'Hotel', 'Osmena Blvd, Cebu City', 4.0, ARRAY['Wed', 'Sat'], 'PM', 10.2941, 123.8960, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Harbor City Food Court', 'Commercial Complex', 'M.L. Quezon Ave, Mandaue City', 5.5, ARRAY['Tue', 'Thu'], 'AM', 10.3458, 123.9612, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Elizabeth Mall', 'Shopping Mall', 'Bogo City, Cebu', 4.2, ARRAY['Mon', 'Fri'], 'PM', 11.0407, 123.9967, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Golden Peak Hotel', 'Hotel', 'Archbishop Reyes Ave, Cebu City', 3.8, ARRAY['Wed', 'Sat'], 'AM', 10.3175, 123.9015, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Gaisano Grand Mall Mactan', 'Shopping Mall', 'M.L. Quezon Highway, Lapu-Lapu City', 7.0, ARRAY['Tue', 'Fri'], 'PM', 10.3128, 123.9758, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Fooda Food Hall SM Seaside', 'Food Complex', 'South Road Properties, Cebu City', 6.5, ARRAY['Mon', 'Thu'], 'AM', 10.2787, 123.8754, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Cebu Business Hotel', 'Hotel', 'Pope John Paul II Ave, Cebu City', 3.2, ARRAY['Wed', 'Sat'], 'PM', 10.3192, 123.9066, 'CLIENT-' || substr(md5(random()::text), 0, 16)),
('Crown Regency Hotels', 'Hotel', 'Osmena Blvd, Cebu City', 4.5, ARRAY['Tue', 'Fri'], 'AM', 10.2994, 123.8935, 'CLIENT-' || substr(md5(random()::text), 0, 16));
```

## Features

- All clients have realistic MT requirements (3.2 - 12.0 MT per collection)
- Collection days vary to spread workload across the week
- Mix of AM and PM shift preferences
- Real latitude/longitude coordinates for location-based route optimization
- Includes major hotels, shopping malls, and commercial complexes in Cebu area
