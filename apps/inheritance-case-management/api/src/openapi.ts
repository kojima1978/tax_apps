// OpenAPI ドキュメント
export const openApiDocument = {
  openapi: '3.0.0',
  info: {
    title: '相続税案件管理 API',
    version: '1.0.0',
    description: '相続税申告案件を管理するための REST API',
  },
  servers: [
    {
      url: 'http://localhost:3021',
      description: '開発サーバー',
    },
  ],
  tags: [
    { name: 'Cases', description: '案件管理' },
    { name: 'Assignees', description: '担当者管理' },
    { name: 'Referrers', description: '紹介者管理' },
  ],
  paths: {
    '/api/cases': {
      get: {
        tags: ['Cases'],
        summary: '案件一覧取得',
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Case' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Cases'],
        summary: '案件作成',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCase' },
            },
          },
        },
        responses: {
          '201': {
            description: '作成成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Case' },
              },
            },
          },
          '400': {
            description: 'バリデーションエラー',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/cases/{id}': {
      get: {
        tags: ['Cases'],
        summary: '案件詳細取得',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Case' },
              },
            },
          },
          '404': {
            description: '案件が見つかりません',
          },
        },
      },
      put: {
        tags: ['Cases'],
        summary: '案件更新',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCase' },
            },
          },
        },
        responses: {
          '200': {
            description: '更新成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Case' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Cases'],
        summary: '案件削除',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '204': {
            description: '削除成功',
          },
        },
      },
    },
    '/api/assignees': {
      get: {
        tags: ['Assignees'],
        summary: '担当者一覧取得',
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Assignee' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Assignees'],
        summary: '担当者作成',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateAssignee' },
            },
          },
        },
        responses: {
          '201': {
            description: '作成成功',
          },
        },
      },
    },
    '/api/referrers': {
      get: {
        tags: ['Referrers'],
        summary: '紹介者一覧取得',
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Referrer' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Referrers'],
        summary: '紹介者作成',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateReferrer' },
            },
          },
        },
        responses: {
          '201': {
            description: '作成成功',
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'ヘルスチェック',
        responses: {
          '200': {
            description: 'サーバー稼働中',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Case: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          deceasedName: { type: 'string', description: '被相続人氏名' },
          dateOfDeath: { type: 'string', description: '死亡日' },
          status: { type: 'string', enum: ['未着手', '進行中', '完了', '請求済'] },
          acceptanceStatus: { type: 'string', enum: ['受託可', '受託不可', '未判定', '保留'] },
          taxAmount: { type: 'integer', description: '相続税額' },
          feeAmount: { type: 'integer', description: '報酬額' },
          fiscalYear: { type: 'integer', description: '年度' },
          estimateAmount: { type: 'integer', description: '見積額' },
          propertyValue: { type: 'integer', description: '財産評価額' },
          referralFeeRate: { type: 'number', description: '紹介料率(%)' },
          referralFeeAmount: { type: 'integer', description: '紹介料' },
          assignee: { type: 'string', description: '担当者' },
          referrer: { type: 'string', description: '紹介者' },
          contacts: { type: 'array', description: '連絡先' },
          progress: { type: 'array', description: '進捗' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateCase: {
        type: 'object',
        required: ['deceasedName', 'dateOfDeath', 'fiscalYear'],
        properties: {
          deceasedName: { type: 'string' },
          dateOfDeath: { type: 'string' },
          fiscalYear: { type: 'integer' },
          status: { type: 'string' },
          acceptanceStatus: { type: 'string' },
          taxAmount: { type: 'integer' },
          feeAmount: { type: 'integer' },
          assignee: { type: 'string' },
          referrer: { type: 'string' },
        },
      },
      UpdateCase: {
        type: 'object',
        properties: {
          deceasedName: { type: 'string' },
          dateOfDeath: { type: 'string' },
          status: { type: 'string' },
          acceptanceStatus: { type: 'string' },
          taxAmount: { type: 'integer' },
          feeAmount: { type: 'integer' },
        },
      },
      Assignee: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', description: '氏名' },
          employeeId: { type: 'string', description: '社員番号' },
          department: { type: 'string', description: '部署' },
          active: { type: 'boolean', description: '有効' },
        },
      },
      CreateAssignee: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          employeeId: { type: 'string' },
          department: { type: 'string' },
        },
      },
      Referrer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          company: { type: 'string', description: '会社名' },
          name: { type: 'string', description: '担当者名' },
          department: { type: 'string', description: '部署' },
          active: { type: 'boolean', description: '有効' },
        },
      },
      CreateReferrer: {
        type: 'object',
        required: ['company', 'name'],
        properties: {
          company: { type: 'string' },
          name: { type: 'string' },
          department: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
          message: { type: 'string' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};
