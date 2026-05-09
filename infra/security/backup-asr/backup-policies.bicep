// name: backup-policies | owner agent: A3 | purpose: common backup retention policies for RSV

targetScope = 'resourceGroup'

param vaultName string
param timeZone string = 'UTC'
param dailyBackupTime string = '2026-01-01T22:00:00Z'

resource vault 'Microsoft.RecoveryServices/vaults@2023-02-01' existing = {
  name: vaultName
}

var dailySchedule = {
  schedulePolicyType: 'SimpleSchedulePolicy'
  scheduleRunFrequency: 'Daily'
  scheduleRunTimes: [
    dailyBackupTime
  ]
}

var longRetention = {
  retentionPolicyType: 'LongTermRetentionPolicy'
  dailySchedule: {
    retentionTimes: [
      dailyBackupTime
    ]
    retentionDuration: {
      count: 30
      durationType: 'Days'
    }
  }
  weeklySchedule: {
    daysOfTheWeek: [
      'Sunday'
    ]
    retentionTimes: [
      dailyBackupTime
    ]
    retentionDuration: {
      count: 12
      durationType: 'Weeks'
    }
  }
  monthlySchedule: {
    retentionScheduleFormatType: 'Weekly'
    retentionScheduleWeekly: {
      daysOfTheWeek: [
        'Sunday'
      ]
      weeksOfTheMonth: [
        'First'
      ]
    }
    retentionTimes: [
      dailyBackupTime
    ]
    retentionDuration: {
      count: 12
      durationType: 'Months'
    }
  }
  yearlySchedule: {
    retentionScheduleFormatType: 'Weekly'
    monthsOfYear: [
      'January'
    ]
    retentionScheduleWeekly: {
      daysOfTheWeek: [
        'Sunday'
      ]
      weeksOfTheMonth: [
        'First'
      ]
    }
    retentionTimes: [
      dailyBackupTime
    ]
    retentionDuration: {
      count: 5
      durationType: 'Years'
    }
  }
}

resource postgresPolicy 'Microsoft.RecoveryServices/vaults/backupPolicies@2023-02-01' = {
  parent: vault
  name: 'udcsp-postgres-daily'
  properties: {
    backupManagementType: 'AzureWorkload'
    workLoadType: 'PostgreSQL'
    policyType: 'Full'
    timeZone: timeZone
    schedulePolicy: dailySchedule
    retentionPolicy: longRetention
  }
}

resource storagePolicy 'Microsoft.RecoveryServices/vaults/backupPolicies@2023-02-01' = {
  parent: vault
  name: 'udcsp-storage-daily'
  properties: {
    backupManagementType: 'AzureStorage'
    workLoadType: 'AzureFileShare'
    policyType: 'V1'
    timeZone: timeZone
    schedulePolicy: dailySchedule
    retentionPolicy: {
      retentionPolicyType: 'LongTermRetentionPolicy'
      dailySchedule: {
        retentionTimes: [
          dailyBackupTime
        ]
        retentionDuration: {
          count: 30
          durationType: 'Days'
        }
      }
      weeklySchedule: {
        daysOfTheWeek: [
          'Sunday'
        ]
        retentionTimes: [
          dailyBackupTime
        ]
        retentionDuration: {
          count: 52
          durationType: 'Weeks'
        }
      }
      monthlySchedule: {
        retentionScheduleFormatType: 'Weekly'
        retentionScheduleWeekly: {
          daysOfTheWeek: [
            'Sunday'
          ]
          weeksOfTheMonth: [
            'First'
          ]
        }
        retentionTimes: [
          dailyBackupTime
        ]
        retentionDuration: {
          count: 72
          durationType: 'Months'
        }
      }
    }
  }
}

resource vmPolicy 'Microsoft.RecoveryServices/vaults/backupPolicies@2023-02-01' = {
  parent: vault
  name: 'udcsp-vm-daily'
  properties: {
    backupManagementType: 'AzureIaasVM'
    policyType: 'V2'
    timeZone: timeZone
    schedulePolicy: dailySchedule
    retentionPolicy: longRetention
  }
}

output policyIds array = [
  postgresPolicy.id
  storagePolicy.id
  vmPolicy.id
]
