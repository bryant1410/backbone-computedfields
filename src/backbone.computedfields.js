/*
    Backbone.ComputedFields v.0.0.1
    (c) 2012 alexander.beletsky@gmail.com
    Distributed Under MIT License
*/

(function () {

    if (!Backbone) {
        throw 'Please include Backbone.js before Backbone.ComputedFields.js';
    }

    var ComputedFields = function (model) {
        this.model = model;
        this._computedFields = [];

        this.initialize();
    };

    ComputedFields.VERSION = '0.0.1';

    _.extend(ComputedFields.prototype, {
        initialize: function () {
            _.bindAll(this);

            this._lookUpComputedFields();
            this._bindModelEvents();
            this._wrapJSON();
        },

        _lookUpComputedFields: function () {
            for (var obj in this.model) {
                var field = this.model[obj];

                // TODO: find a better way of computed field detection..
                if (field && (field.set || field.get) && obj !== 'collection') {
                    this._computedFields.push({name: obj, field: field});
                }
            }
        },

        _bindModelEvents: function () {
            _.each(this._computedFields, function (computedField) {
                var fieldName = computedField.name;
                var field = computedField.field;
                
                var updateComputedFieldValue = _.bind(function () {
                    var value = this._computeFieldValue(field);
                    this.model.set(fieldName, value, { triggeredBy: 'updateComputedFieldValue' });
                }, this);

                var updateDependentFieldsValue = _.bind(function (model, value, options) {
                    // if dependent field changed by set in updateComputedFieldValue we'll skip it
                    if (options && options.triggeredBy === 'updateComputedFieldValue') {
                        return;
                    }

                    var fields = this._dependentFields(field.depends);
                    
                    field.set.call(this.model, value, fields);
                    this.model.set(fields);
                }, this);

                // listen to all dependent fields and update attribute value
                _.each(field.depends, function (name) {
                    this.model.on('change:' + name, updateComputedFieldValue);
                }, this);

                // listen to computed field change and update dependent fields
                this.model.on('change:' + fieldName, updateDependentFieldsValue);

                updateComputedFieldValue();
            }, this);
        },

        _wrapJSON: function () {
            this.model.toJSON = _.wrap(this.model.toJSON, this._toJSON);
        },

        _toJSON: function (toJSON) {
            var attributes = toJSON.call(this.model);

            var stripped = _.reduce(this._computedFields, function (memo, computed) {
                if (computed.field.toJSON === false) {
                    memo.push(computed.name);
                }
                return memo;
            },[]);

            return _.omit(attributes, stripped);
        },

        _computeFieldValue: function (computedField) {
            if (computedField && computedField.get) {
                var fields = this._dependentFields(computedField.depends);
                return computedField.get.call(this.model, fields);
            }
        },

        _dependentFields: function (depends) {
            return _.reduce(depends, function (memo, field) {
                memo[field] = this.model.attributes[field];
                return memo;
            }, {}, this);
        }

    });

    Backbone.ComputedFields = ComputedFields;

})();