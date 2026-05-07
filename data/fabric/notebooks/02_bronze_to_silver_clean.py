"""
Cell 1: Read country parameter and bronze cases.
Cell 2: Validate required columns and normalise schema.
Cell 3: Add Purview-friendly PII tag columns and write silver tables.
"""
from pyspark.sql import functions as F

country = spark.conf.get("udcsp.country", "dk").lower()
required = {"application_id", "citizen_id", "submitted_at", "status", "case_type"}
df = spark.table(f"bronze_{country}_d365_cases")
missing = required - set(df.columns)
if missing:
    raise ValueError(f"Missing required columns: {sorted(missing)}")

silver = (df.select("application_id", "citizen_id", "submitted_at", "status", "case_type", "country")
            .dropDuplicates(["application_id"])
            .withColumn("pii_tags", F.array(F.lit("Confidential-Citizen"), F.lit("NordicNationalID")))
            .withColumn("quality_status", F.lit("validated")))
silver.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(f"silver_{country}_applications")
