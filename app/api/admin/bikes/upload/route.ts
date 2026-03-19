import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Accept JSON body with rows
    const body = await request.json()
    const { rows } = body

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    const progress = {
      total: rows.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    }

    // Helper to get value from row using multiple possible keys
    const getValue = (row: any, keys: string[]) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return row[key];
        }
      }
      return null;
    }

    const bikesToInsert = []

    for (let j = 0; j < rows.length; j++) {
      const rowData = rows[j] // dict from client-side parse
      // client-side parse should already have headers as keys

      try {
        // Validate required fields
        if (!getValue(rowData, ['brand', 'Brand']) || !getValue(rowData, ['model', 'Model']) || !getValue(rowData, ['year', 'Year'])) {
          // We continue to allow missing category if not strict, but code says verify
          // Let's stick to existing logic but safe-guard
        }

        const brand = getValue(rowData, ['brand', 'Brand']);
        const model = getValue(rowData, ['model', 'Model']);
        const year = getValue(rowData, ['year', 'Year']);
        const category = getValue(rowData, ['category', 'Category']);

        if (!brand || !model || !year || !category) {
          throw new Error('Missing required fields: brand, model, year, or category')
        }

        // Generate unique slug
        const baseSlug = `${brand}-${model}-${year}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')

        // Add ID to make slug unique if it exists in the CSV
        const slug = rowData.id ? `${baseSlug}-${rowData.id}` : baseSlug

        // Parse images - handle both "images" and "image urls" columns
        let imagesArray: string[] | null = null
        const imagesStr = getValue(rowData, ['images', 'Images', 'image urls', 'Image URLs', 'image_urls']);
        if (imagesStr) {
          imagesArray = imagesStr.split(',').map((url: string) => url.trim()).filter((url: string) => url)
        }

        // Prepare bike data with correct schema column names
        const bikeData: any = {
          brand: brand,
          model: model,
          year: parseInt(year),
          slug,
          category: category,
          sub_category: getValue(rowData, ['sub_category', 'subcategory', 'Sub Category', 'Sub_Category']),
          price: rowData.price ? parseFloat(rowData.price.toString().replace(/[^0-9.]/g, '')) : null,
          weight: getValue(rowData, ['weight', 'Weight']),
          frame: getValue(rowData, ['frame', 'Frame']),
          travel_front: getValue(rowData, ['travel_front', 'Travel_Front']),
          travel_rear: getValue(rowData, ['travel_rear', 'Travel_Rear']),
          wheels: getValue(rowData, ['wheels', 'Wheels']),
          groupset: getValue(rowData, ['groupset', 'Groupset']),
          fork: getValue(rowData, ['fork', 'Fork']),
          suspension: getValue(rowData, ['suspension', 'Suspension']),
          motor: getValue(rowData, ['motor', 'Motor']),
          battery: getValue(rowData, ['battery', 'Battery']),
          drivetrain: getValue(rowData, ['drivetrain', 'Drivetrain']),
          brakes: getValue(rowData, ['brakes', 'Brakes']),
          brakes2: getValue(rowData, ['brakes2', 'Brakes2', 'BRAKES2']),
          spokes: getValue(rowData, ['spokes', 'Spokes']),
          brake_levers: getValue(rowData, ['brake_levers', 'Brake_Levers']),
          stem: getValue(rowData, ['stem', 'Stem']),
          handlebar: getValue(rowData, ['handlebar', 'Handlebar']),
          frame_description: getValue(rowData, ['frame_description', 'Frame_Description']),
          suspension_fork_description: getValue(rowData, ['suspension_fork_description', 'Suspension_Fork_Description']),
          rear_shock_description: getValue(rowData, ['rear_shock_description', 'Rear_Shock_Description']),
          rear_derailleur: getValue(rowData, ['rear_derailleur', 'Rear_Derailleur']),
          front_derailleur: getValue(rowData, ['front_derailleur', 'Front_Derailleur']),
          shift_levers: getValue(rowData, ['shift_levers', 'Shift_Levers']),
          cassette: getValue(rowData, ['cassette', 'Cassette']),
          crank: getValue(rowData, ['crank', 'Crank']),
          bottom_bracket: getValue(rowData, ['bottom_bracket', 'Bottom_Bracket']),
          chain: getValue(rowData, ['chain', 'Chain']),
          pedals: getValue(rowData, ['pedals', 'Pedals']),
          front_hub: getValue(rowData, ['front_hub', 'Front_Hub']),
          rear_hub: getValue(rowData, ['rear_hub', 'Rear_Hub']),
          grips: getValue(rowData, ['grips', 'Grips']),
          saddle: getValue(rowData, ['saddle', 'Saddle']),
          seatpost: getValue(rowData, ['seatpost', 'Seatpost']),
          motor3: getValue(rowData, ['motor3', 'Motor3', 'MOTOR3']),
          battery4: getValue(rowData, ['battery4', 'Battery4', 'BATTERY4']),
          charger: getValue(rowData, ['charger', 'Charger']),
          rims: getValue(rowData, ['rims', 'Rims']),
          tires: getValue(rowData, ['tires', 'Tires']),
          images: imagesArray,
          geometry_data: rowData.geometry_data,
          url: rowData.url,
          title: getValue(rowData, ['title', 'Title']),
          meta_desc: getValue(rowData, ['meta_desc', 'Meta_Desc']),
          bike_desc: getValue(rowData, ['bike_desc', 'Bike_Desc']),
          title_seo: getValue(rowData, ['title_seo', 'Title_SEO']),
        }

        // --- Localized Description Fields ---
        const descFields = ['bike_desc', 'meta_desc', 'title_seo']
        const languages = ['fr', 'de', 'es', 'it', 'nl']

        descFields.forEach(field => {
          languages.forEach(lang => {
            const key = `${field}_${lang}`
            if (rowData[key]) bikeData[key] = rowData[key]
          })
        })

        // --- Localized Reason Fields ---
        // Map of DB root field to possible CSV headers (if different) or just root field
        const reasonFields = [
          'fit_reason', 'vfm_reason', 'build_reason', 'aero_reason', 'climb_reason',
          'suspension_reason', 'posture_reason', 'responsiveness_reason', 'speed_reason',
          'comfort_reason', 'surface_reason', 'battery_reason'
        ]

        reasonFields.forEach(field => {
          // Main field mapping handled partially above or via loop here?
          // Let's handle legacy vs new here generically if possible, but map is complex.
          // We'll rely on explicit localized columns from CSV matching DB columns: e.g. speed_reason_fr

          languages.forEach(lang => {
            const key = `${field}_${lang}`
            if (rowData[key]) bikeData[key] = rowData[key]
          })
        })


        // Add numeric fields with proper conversion
        const numericFields = [
          'stack_reach_ratio', 'bottom_bracket_height', 'front_center', 'rake', 'trail',
          'stack', 'reach', 'top_tube_length', 'seat_tube_angle', 'seat_tube_length',
          'head_tube_angle', 'head_tube_length', 'chainstay_length', 'wheelbase',
          'bottom_bracket_drop', 'standover_height', 'rider_min_height', 'rider_max_height',
          'overall_score', 'performance_score', 'value_score', 'fit_score', 'general_score'
        ]

        numericFields.forEach(field => {
          if (rowData[field]) {
            const cleaned = rowData[field].toString().replace(/[^0-9.]/g, '')
            if (cleaned) {
              bikeData[field] = parseFloat(cleaned)
            }
          }
        })

        // Preserve decimal scores for 1-10 rating fields.
        const ratingFields = [
          'fit_flexibility_1_10', 'vfm_score_1_to_10', 'build_1_10', 'aero_1_10',
          'climb_1_10', 'suspension_1_10', 'posture_1_10',
          'responsiveness_1_10', 'ride_comfort_1_10'
        ]

        ratingFields.forEach(field => {
          if (rowData[field]) {
            const cleaned = rowData[field].toString().replace(/[^0-9.]/g, '')
            if (cleaned) {
              bikeData[field] = parseFloat(cleaned)
            }
          }
        })

        const integerFields = ['torso_angle_deg', 'speed_index']

        integerFields.forEach(field => {
          if (rowData[field]) {
            const cleaned = rowData[field].toString().replace(/[^0-9]/g, '')
            if (cleaned) {
              bikeData[field] = parseInt(cleaned)
            }
          }
        })

        // Add text bucket fields
        const bucketFields = [
          'fit_flexibility_bucket', 'vfm_score_bucket', 'build_bucket', 'aero_bucket',
          'climb_bucket', 'suspension_bucket', 'posture_bucket', 'responsiveness_bucket',
          'speed_bucket', 'ride_comfort_bucket', 'category_fit', 'surface_range',
          'battery_range', 'battery_bucket'
        ]

        bucketFields.forEach(field => {
          if (rowData[field]) {
            bikeData[field] = rowData[field]
          }
        })

        // Add score explanation fields (support both new and legacy column names)
        // Map legacy "reason" columns to new "explanation" columns
        const explanationMapping: Record<string, string[]> = {
          'fit_flexibility_explanation': ['fit_flexibility_explanation', 'fit_reason'],
          'value_for_money_explanation': ['value_for_money_explanation', 'vfm_reason'],
          'build_quality_explanation': ['build_quality_explanation', 'build_reason'],
          'aerodynamics_explanation': ['aerodynamics_explanation', 'aero_reason'],
          'climbing_efficiency_explanation': ['climbing_efficiency_explanation', 'climb_reason'],
          'riding_position_explanation': ['riding_position_explanation', 'posture_reason'],
          'handling_explanation': ['handling_explanation', 'responsiveness_reason'],
          'ride_comfort_explanation': ['ride_comfort_explanation', 'comfort_reason'],
          'surface_range_explanation': ['surface_range_explanation', 'surface_reason'],
          'overall_score_explanation': ['overall_score_explanation'],
          'performance_score_explanation': ['performance_score_explanation', 'speed_reason'],
          'value_score_explanation': ['value_score_explanation'],
          'fit_score_explanation': ['fit_score_explanation'],
          'general_score_explanation': ['general_score_explanation'],
        }

        Object.entries(explanationMapping).forEach(([dbField, possibleColumns]) => {
          for (const column of possibleColumns) {
            if (rowData[column]) {
              bikeData[dbField] = rowData[column]
              break // Use first matching column found
            }
          }
        })

        // Ensure mapped reasons are also copied to their modern column names if they exist in schema
        // and weren't caught by the loop above (e.g. speed_reason)
        // speed_reason was handled at top.
        // reasonFields loop handled localized versions.
        // We should ensure base english reasons are also populated in their specific columns 
        // if the CSV provided them as e.g. "climbing_efficiency_explanation" but we want "climb_reason" too?
        // Actually, the explanationMapping handles DB fields like 'climbing_efficiency_explanation'. 
        // If DB has 'climb_reason' as well, we should map to it.
        // The Bike interface in supabase.ts shows both sets of columns (e.g. fit_reason AND fit_score_explanation).
        // Let's ensure both are populated if possible.

        if (rowData.fit_flexibility_explanation) bikeData.fit_reason = rowData.fit_flexibility_explanation
        if (rowData.value_for_money_explanation) bikeData.vfm_reason = rowData.value_for_money_explanation
        if (rowData.build_quality_explanation) bikeData.build_reason = rowData.build_quality_explanation
        if (rowData.aerodynamics_explanation) bikeData.aero_reason = rowData.aerodynamics_explanation
        if (rowData.climbing_efficiency_explanation) bikeData.climb_reason = rowData.climbing_efficiency_explanation
        if (rowData.riding_position_explanation) bikeData.posture_reason = rowData.riding_position_explanation
        if (rowData.handling_explanation) bikeData.responsiveness_reason = rowData.handling_explanation
        if (rowData.ride_comfort_explanation) bikeData.comfort_reason = rowData.ride_comfort_explanation
        if (rowData.surface_range_explanation) bikeData.surface_reason = rowData.surface_range_explanation


        bikesToInsert.push(bikeData)
        progress.processed++
      } catch (error: any) {
        progress.processed++
        progress.failed++
        progress.errors.push({ row: j + 2, error: error.message }) // j is index in batch
      }
    }

    // Insert batch
    if (bikesToInsert.length > 0) {
      const { data, error } = await supabaseServer
        .from('bikes')
        .insert(bikesToInsert)
        .select('id')

      if (error) {
        console.error("Batch insert error:", error)
        // Handle duplicate slugs or other errors by inserting one by one
        for (let k = 0; k < bikesToInsert.length; k++) {
          try {
            const { error: insertError } = await supabaseServer
              .from('bikes')
              .insert([bikesToInsert[k]])

            if (insertError) {
              console.error("Single insert error:", insertError)
              progress.failed++
              progress.errors.push({
                row: k + 1, // simplified row tracking
                error: insertError.message || 'Insert failed'
              })
            } else {
              progress.successful++
            }
          } catch (err: any) {
            progress.failed++
            progress.errors.push({
              row: k + 1,
              error: err.message || 'Insert failed'
            })
          }
        }
      } else {
        progress.successful += data.length
      }
    }

    return NextResponse.json(progress)
  } catch (error: any) {
    console.error('Error in CSV upload:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Proper CSV parser that handles quoted fields with newlines
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"'
        i++
      } else {
        // Toggle quotes
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRow.push(currentField)
      currentField = ''
    } else if (char === '\n' && !inQuotes) {
      // End of row (only if not inside quotes)
      currentRow.push(currentField)
      if (currentRow.some(field => field.trim())) {
        // Only add non-empty rows
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
      // Skip \r if it's \r\n
      if (text[i - 1] === '\r') {
        continue
      }
    } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
      // Handle \r\n line ending
      currentRow.push(currentField)
      if (currentRow.some(field => field.trim())) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
      i++ // Skip the \n
    } else {
      currentField += char
    }
  }

  // Add last field and row if any
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    if (currentRow.some(field => field.trim())) {
      rows.push(currentRow)
    }
  }

  return rows
}
