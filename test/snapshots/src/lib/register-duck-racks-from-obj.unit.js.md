# Snapshot report for `src/lib/register-duck-racks-from-obj.unit.js`

The actual snapshot is saved in `register-duck-racks-from-obj.unit.js.snap`.

Generated by [AVA](https://avajs.dev).

## register multiple ducks from an object mapping duck-models

> Snapshot 1

    [
      DuckRack {
        _events: {
          create: Function {},
          delete: Function {},
          list: Function {},
          method: Function {},
          read: Function {},
          update: Function {},
        },
        _eventsCount: undefined,
        _maxListeners: undefined,
        _methods: {},
        _proxy: [Circular],
        duckModel: Duck {
          _events: {},
          _eventsCount: 0,
          _maxListeners: undefined,
          idType: 'ObjectId',
          inlineStructureValidation: true,
          originalSchema: Schema {
            _cast: undefined,
            _defaultSettings: {
              allowNull: false,
              default: undefined,
              required: true,
            },
            _defaultValues: {},
            _methods: {
              log: Function log {},
            },
            _settings: {},
            _validate: undefined,
            children: [
              Schema {
                _cast: undefined,
                _defaultSettings: {
                  allowEmpty: true,
                  allowNull: false,
                  autoCast: false,
                  default: undefined,
                  emptyError: 'Value can not be empty',
                  enum: [],
                  enumError: 'Unknown enum option { value }',
                  lowercase: false,
                  required: true,
                  typeError: 'Invalid string',
                  uppercase: false,
                },
                _defaultValues: {},
                _methods: {},
                _settings: {},
                _validate: undefined,
                children: [],
                currentType: 'String',
                name: 'fullName',
                originalName: 'fullName',
                parent: [Circular],
                schema: Function String {},
                type: 'String',
                virtuals: [],
              },
              Schema {
                _cast: undefined,
                _defaultSettings: {
                  allowEmpty: true,
                  allowNull: false,
                  autoCast: false,
                  default: undefined,
                  emptyError: 'Value can not be empty',
                  enum: [],
                  enumError: 'Unknown enum option { value }',
                  lowercase: false,
                  required: true,
                  typeError: 'Invalid string',
                  uppercase: false,
                },
                _defaultValues: {},
                _methods: {},
                _settings: {},
                _validate: undefined,
                children: [],
                currentType: 'String',
                name: 'password',
                originalName: 'password',
                parent: [Circular],
                schema: Function String {},
                type: 'String',
                virtuals: [],
              },
              Schema {
                _cast: undefined,
                _defaultSettings: {
                  allowNull: false,
                  default: Function default {},
                  required: false,
                  typeError: 'Invalid array',
                },
                _defaultValues: {},
                _methods: {},
                _settings: {
                  default: Function default {},
                  required: false,
                },
                _validate: undefined,
                children: [],
                currentType: 'Array',
                name: 'logs',
                originalName: 'logs',
                parent: [Circular],
                schema: {
                  default: Function default {},
                  type: Function Array {},
                },
                type: 'Array',
                virtuals: [],
              },
            ],
            currentType: 'Object',
            name: '',
            originalName: '',
            parent: undefined,
            schema: {
              fullName: Function String {},
              logs: {
                default: Function default {},
                type: Function Array {},
              },
              password: Function String {},
            },
            type: 'Object',
            virtuals: [],
          },
          schema: Schema {
            _cast: undefined,
            _defaultSettings: {
              allowNull: false,
              default: undefined,
              required: true,
            },
            _defaultValues: {},
            _methods: {
              log: Function log {},
            },
            _settings: {},
            _validate: undefined,
            children: [
              Schema {
                _cast: undefined,
                _defaultSettings: {
                  allowNull: false,
                  autoCast: true,
                  default: Function default {},
                  required: false,
                  unique: true,
                },
                _defaultValues: {},
                _methods: {},
                _settings: {
                  default: Function default {},
                  required: false,
                },
                _validate: undefined,
                children: [],
                currentType: 'ObjectId',
                name: '_id',
                originalName: '_id',
                parent: [Circular],
                schema: 'ObjectId',
                type: 'ObjectId',
                virtuals: [],
              },
              Schema {
                _cast: undefined,
                _defaultSettings: {
                  allowNull: false,
                  autoCast: true,
                  decimalPlaces: undefined,
                  default: Function default {},
                  integer: false,
                  integerError: 'Invalid integer',
                  max: undefined,
                  maxError: 'maximum accepted value is { value }',
                  min: undefined,
                  minError: 'minimum accepted value is { value }',
                  required: false,
                  typeError: 'Invalid number',
                },
                _defaultValues: {},
                _methods: {},
                _settings: {
                  autoCast: true,
                  default: Function default {},
                  required: false,
                },
                _validate: undefined,
                children: [],
                currentType: 'Number',
                name: '_v',
                originalName: '_v',
                parent: [Circular],
                schema: {
                  autoCast: true,
                  default: Function default {},
                  required: false,
                  type: Function Number {},
                },
                type: 'Number',
                virtuals: [],
              },
              Schema {
                _cast: undefined,
                _defaultSettings: {
                  allowEmpty: true,
                  allowNull: false,
                  autoCast: false,
                  default: undefined,
                  emptyError: 'Value can not be empty',
                  enum: [],
                  enumError: 'Unknown enum option { value }',
                  lowercase: false,
                  required: true,
                  typeError: 'Invalid string',
                  uppercase: false,
                },
                _defaultValues: {},
                _methods: {},
                _settings: {},
                _validate: undefined,
                children: [],
                cloned: true,
                currentType: 'String',
                name: 'fullName',
                originalName: 'fullName',
                parent: [Circular],
                schema: Function String {},
                type: 'String',
                virtuals: [],
              },
              Schema {
                _cast: undefined,
                _defaultSettings: {
                  allowEmpty: true,
                  allowNull: false,
                  autoCast: false,
                  default: undefined,
                  emptyError: 'Value can not be empty',
                  enum: [],
                  enumError: 'Unknown enum option { value }',
                  lowercase: false,
                  required: true,
                  typeError: 'Invalid string',
                  uppercase: false,
                },
                _defaultValues: {},
                _methods: {},
                _settings: {},
                _validate: undefined,
                children: [],
                cloned: true,
                currentType: 'String',
                name: 'password',
                originalName: 'password',
                parent: [Circular],
                schema: Function String {},
                type: 'String',
                virtuals: [],
              },
              Schema {
                _cast: undefined,
                _defaultSettings: {
                  allowNull: false,
                  default: Function default {},
                  required: false,
                  typeError: 'Invalid array',
                },
                _defaultValues: {},
                _methods: {},
                _settings: {
                  default: Function default {},
                  required: false,
                },
                _validate: undefined,
                children: [],
                cloned: true,
                currentType: 'Array',
                name: 'logs',
                originalName: 'logs',
                parent: [Circular],
                schema: {
                  default: Function default {},
                  type: Function Array {},
                },
                type: 'Array',
                virtuals: [],
              },
            ],
            cloned: true,
            currentType: 'Object',
            name: '',
            originalName: '',
            parent: undefined,
            schema: {
              fullName: Function String {},
              logs: {
                default: Function default {},
                type: Function Array {},
              },
              password: Function String {},
            },
            type: 'Object',
            virtuals: [],
          },
        },
        events: {},
        hook: Function bound hook {},
        hooks: Hooks {
          hooks: [
            {
              cb: AsyncFunction {},
              hookName: 'read',
              lifeCycle: 'after',
            },
            {
              cb: AsyncFunction {},
              hookName: 'create',
              lifeCycle: 'after',
            },
            {
              cb: AsyncFunction {},
              hookName: 'create',
              lifeCycle: 'before',
            },
            {
              cb: Function {},
              hookName: 'create',
              lifeCycle: 'before',
            },
            {
              cb: AsyncFunction {},
              hookName: 'update',
              lifeCycle: 'before',
            },
            {
              cb: AsyncFunction [],
              hookName: 'create',
              lifeCycle: 'before',
            },
            {
              cb: AsyncFunction {},
              hookName: 'update',
              lifeCycle: 'before',
            },
            {
              cb: AsyncFunction {},
              hookName: 'apply',
              lifeCycle: 'before',
            },
            {
              cb: AsyncFunction {},
              hookName: 'create',
              lifeCycle: 'before',
            },
            {
              cb: AsyncFunction {},
              hookName: 'update',
              lifeCycle: 'before',
            },
            {
              cb: AsyncFunction {},
              hookName: 'update',
              lifeCycle: 'after',
            },
            {
              cb: AsyncFunction {},
              hookName: 'delete',
              lifeCycle: 'before',
            },
            {
              cb: AsyncFunction {},
              hookName: 'delete',
              lifeCycle: 'after',
            },
          ],
        },
        idType: 'ObjectId',
        isLocked: Function {},
        lock: AsyncFunction {},
        methods: {},
        name: 'user',
        store: [],
        storeKey: {},
        trigger: AsyncFunction {},
        unlock: Function {},
      },
    ]
