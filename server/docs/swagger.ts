// Swagger / OpenAPI 3.0 Documentation Specification
export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Khyber Logistics services API',
    version: '1.0.0',
    description: 'Enterprise REST API backend for Khyber Logistics services - Saudi Arabian fleet management, Iqama compliance tracking, ERP webhooks, vehicle inspection (MVPI Fahs), insurance, maintenance, and fuel economics.',
    contact: {
      name: 'Khyber Logistics Support',
      email: 'info@khyber-logistics.com.sa'
    }
  },
  servers: [
    {
      url: '/api',
      description: 'API Gateway Endpoint'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token'
      }
    },
    schemas: {
      Vehicle: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          internalVehicleId: { type: 'string', example: 'FLT-101' },
          plateNumber: { type: 'string', example: '7845 XYZ' },
          plateDigits: { type: 'string', example: '7845' },
          plateLettersEn: { type: 'string', example: 'XYZ' },
          plateDigitsAr: { type: 'string', example: '٧٨٤٥' },
          plateLettersAr: { type: 'string', example: 'س ص ع' },
          make: { type: 'string', example: 'Mercedes-Benz' },
          model: { type: 'string', example: 'Actros 1845 LS' },
          year: { type: 'integer', example: 2023 },
          vin: { type: 'string', example: 'WDB9634031L892104' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SOLD'] },
          currentMileage: { type: 'integer', example: 142500 },
          istimaraExpiry: { type: 'string', format: 'date' },
          insuranceExpiry: { type: 'string', format: 'date' },
          inspectionExpiry: { type: 'string', format: 'date' }
        }
      },
      Worker: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          employeeId: { type: 'string', example: 'EMP-1001' },
          fullName: { type: 'string', example: 'Ahmed Mohammed Al-Omari' },
          fullNameAr: { type: 'string', example: 'أحمد محمد العمري' },
          iqamaNumber: { type: 'string', example: '1092837461' },
          iqamaExpiry: { type: 'string', format: 'date' },
          nationality: { type: 'string', example: 'Saudi' },
          jobTitle: { type: 'string', example: 'Senior Fleet Captain' },
          mobileNumber: { type: 'string', example: '+966 50 481 9201' },
          status: { type: 'string', enum: ['ACTIVE', 'VACATION', 'INACTIVE', 'TERMINATED'] }
        }
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          meta: { type: 'object' }
        }
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VEHICLE_NOT_FOUND' },
              message: { type: 'string', example: 'Vehicle not found' }
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate user and issue JWT session tokens',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'admin123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful with JWT access and refresh tokens' },
          401: { description: 'Invalid credentials or account locked' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get currently authenticated user profile',
        responses: {
          200: { description: 'User profile data' }
        }
      }
    },
    '/search': {
      get: {
        tags: ['Global 360° Search'],
        summary: 'Global instant search across Saudi Plates, VINs, Iqamas, Employee IDs and Names',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Search keyword (e.g. 7845 XYZ, 1092837461, Ahmed, EMP-1001)'
          }
        ],
        responses: {
          200: {
            description: 'Grouped matches. If query is exact Saudi plate or Iqama, full 360° profile is embedded.'
          }
        }
      }
    },
    '/vehicles': {
      get: {
        tags: ['Vehicles'],
        summary: 'List all vehicles with optional filters and pagination',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'departmentId', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: { description: 'List of vehicles' }
        }
      },
      post: {
        tags: ['Vehicles'],
        summary: 'Register a new vehicle with Saudi plate details',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Vehicle' }
            }
          }
        },
        responses: {
          201: { description: 'Vehicle created successfully' }
        }
      }
    },
    '/vehicles/{id}/full-profile': {
      get: {
        tags: ['Vehicles'],
        summary: 'Critical 360° complete vehicle profile (Driver, Istimara, Insurance, MVPI, Maintenance, Fuel, Expenses)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Complete 360° vehicle dossier' }
        }
      }
    },
    '/workers': {
      get: {
        tags: ['Workers'],
        summary: 'List all employees and drivers with Iqama compliance status',
        responses: {
          200: { description: 'List of workers' }
        }
      },
      post: {
        tags: ['Workers'],
        summary: 'Onboard a new worker with 10-digit Saudi Iqama/National ID validation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Worker' }
            }
          }
        },
        responses: {
          201: { description: 'Worker created' }
        }
      }
    },
    '/workers/{id}/full-profile': {
      get: {
        tags: ['Workers'],
        summary: 'Critical 360° complete worker dossier (Assigned vehicle, Iqama, Passport, Driving License, Fuel history, Expiry alerts)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Complete worker profile' }
        }
      }
    },
    '/expiry-alerts': {
      get: {
        tags: ['Expiry Alert Engine'],
        summary: 'Query all active expiry compliance alerts (Iqama, Istimara, Insurance, Fahs, Passports)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'departmentId', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'List of alerts with priority and days remaining' }
        }
      }
    },
    '/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Executive dashboard KPIs, fleet status, financial metrics, and 6-month trends',
        responses: {
          200: { description: 'Dashboard analytics summary' }
        }
      }
    },
    '/maintenance': {
      get: {
        tags: ['Maintenance'],
        summary: 'List maintenance work orders and costs'
      },
      post: {
        tags: ['Maintenance'],
        summary: 'Log new maintenance job with automatic laborCost + partsCost = totalCost calculation'
      }
    },
    '/fuel': {
      get: {
        tags: ['Fuel Economics'],
        summary: 'List fuel consumption records with price per liter and analytics'
      },
      post: {
        tags: ['Fuel Economics'],
        summary: 'Log fuel refill with automatic totalCost = liters * pricePerLiter calculation'
      }
    },
    '/expenses': {
      get: {
        tags: ['Expenses'],
        summary: 'List fleet expenses by category (Fuel, Maintenance, Insurance, Fines, Tires)'
      }
    },
    '/reports/vehicles': {
      get: {
        tags: ['Reports'],
        summary: 'Master vehicle fleet report'
      }
    },
    '/reports/export/excel': {
      get: {
        tags: ['Reports'],
        summary: 'Export live data report to formatted XLSX spreadsheet'
      }
    },
    '/reports/export/pdf': {
      get: {
        tags: ['Reports'],
        summary: 'Export live data report to PDF document'
      }
    },
    '/audit-logs': {
      get: {
        tags: ['Audit & Compliance'],
        summary: 'Query immutable security audit logs (Who, What, When, IP Address, Old/New values)'
      }
    }
  }
};
