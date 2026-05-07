"""
Cell 1: Load silver applications, decisions, AI decisions and conversations.
Cell 2: Compute 28d baseline to 4d target KPI, +38% CSAT trend and AI accuracy by language.
Cell 3: Publish gold KPI table for DirectLake semantic model.
"""
from pyspark.sql import functions as F

country = spark.conf.get("udcsp.country", "dk").lower()
apps = spark.table(f"silver_{country}_applications")
decisions = spark.table(f"silver_{country}_applications_decisions")
ai = spark.table(f"silver_{country}_ai_decisions")
conv = spark.table(f"silver_{country}_conversations")

processing = decisions.agg(F.count("application_id").alias("ApplicationsProcessed"), F.avg("processing_days").alias("AvgProcessingDays"))
csat = conv.groupBy("language").agg((F.avg("csat_score") / F.lit(5.0) * 100).alias("CitizenSatisfactionPct"))
accuracy = ai.groupBy("language").agg((F.avg(F.when(F.col("recommendation") == F.col("human_decision"), 1).otherwise(0)) * 100).alias("AIDecisionAccuracy"))

kpi = (csat.join(accuracy, "language", "outer")
          .crossJoin(processing)
          .withColumn("ProcessingReductionPct", (F.lit(28) - F.col("AvgProcessingDays")) / F.lit(28) * 100)
          .withColumn("ProcessingTargetDays", F.lit(4))
          .withColumn("CSATTargetTrendPct", F.lit(38))
          .withColumn("country", F.upper(F.lit(country))))
kpi.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(f"gold_{country}_citizen_service_kpis")
