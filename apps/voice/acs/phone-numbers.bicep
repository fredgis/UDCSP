@allowed(['dk','se','no']) param country string
@description('Placeholder toll-free number. Do not hardcode real production numbers.') param tollFreeNumber string = country == 'dk' ? '+45...' : country == 'se' ? '+46...' : '+47...'
param acsResourceName string
output requestedNumber string = tollFreeNumber
output note string = 'Phone number acquisition is completed through ACS number management/regulated procurement; this module only parameterises placeholders.'
