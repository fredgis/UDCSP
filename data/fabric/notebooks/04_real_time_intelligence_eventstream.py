"""
Cell 1: Parameterise country and Eventstream source.
Cell 2: Define SLA-breach risk transform for Fabric Real-Time Intelligence.
Cell 3: Write alert candidates to a KQL Eventhouse table.
"""
from pyspark.sql import functions as F

country = spark.conf.get("udcsp.country", "dk").lower()
source = spark.conf.get("udcsp.eventstream.table", f"eventstream_{country}_sla_events")
alerts = (spark.readStream.table(source)
            .withColumn("country", F.upper(F.lit(country)))
            .where((F.col("event_type") == "breach-risk") | (F.col("risk_score") >= 0.8))
            .select("event_id", "application_id", "country", "risk_score", "event_time"))
query = (alerts.writeStream.format("delta")
          .option("checkpointLocation", f"Files/checkpoints/{country}/sla-risk")
          .outputMode("append")
          .toTable(f"rti_{country}_sla_breach_alerts"))
