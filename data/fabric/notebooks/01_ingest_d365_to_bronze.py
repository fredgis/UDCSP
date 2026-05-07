"""
Cell 1: Read country/environment parameters.
Cell 2: Load Dataverse mirrored D365 case tables from OneLake shortcuts.
Cell 3: Append raw records to bronze with ingestion metadata.
"""
from pyspark.sql import functions as F

country = spark.conf.get("udcsp.country", "dk").lower()
env = spark.conf.get("udcsp.env", "dev")
source = f"/lakehouse/default/Files/mirrors/dataverse/{country}/incident"
target = f"Tables/bronze_{country}_d365_cases"

raw = spark.read.format("delta").load(source)
bronze = (raw.withColumn("_ingested_at", F.current_timestamp())
             .withColumn("_source_system", F.lit("d365-dataverse-mirroring"))
             .withColumn("country", F.upper(F.lit(country))))
bronze.write.format("delta").mode("append").option("mergeSchema", "true").saveAsTable(target)
