const os = require('os');

const config = require('./config');

const requests = {};

const authAttempts = {};

const pizzaSold = {};

let currentUsers = 0;

let revenue = 0;

let averageLatencySum = 0;
let requestCount = 0;

let averageLatencySumFactory = 0;
let requestCountFactory = 0;

function requestsTracker(req, res, next) {
  const endpoint = req.method;
  requests[endpoint] = (requests[endpoint] || 0) + 1;
  next();
}

function latency(req, res, next) {
  const start = new Date();

  res.on("finish", () => {
    const end = new Date();
    averageLatencySum += end - start;
    requestCount++;
  });
  next();
}

function factoryLatency(duration) {
  averageLatencySumFactory += duration;
  requestCountFactory++;
}

function usersCheck(req, res, next) {
  res.on("finish", () => {
    if (req.originalUrl == '/api/auth') {
      if (res.statusCode == 200 && req.method == "PUT") {
        currentUsers++;
      } else if (res.statusCode == 200 && req.method == "DELETE") {
        currentUsers--;
      }
    }
    if (req.originalUrl == '/api/order') {
      if (res.statusCode == 200 && req.method == "POST") {
        pizzaSold["success"] = (pizzaSold["success"] || 0) + req.body.items.length;
        for (let i = 0; i < req.body.items.length; i++) {
          revenue += req.body.items[i].price;
        }
      } else if (req.method == "POST") {
        pizzaSold["Failed"] = (pizzaSold["Failed"] || 0) + req.body.items.length;
      }
    }

    if(res.statusCode == 401 || res.statusCode == 404) {
      authAttempts["Failed"] = (authAttempts["Failed"] || 0) + 1;
    } else if (res.statusCode == 200) {
      authAttempts["success"] = (authAttempts["success"] || 0) + 1;
    }
  });
  next();
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

class MetricBuilder {
  constructor() {
    this.metric = { resourceMetrics: [{ scopeMetrics: [{ metrics: [],},],},],}
  }

  histogram_data() {

  }

  add_metric(metricName, metricValue, attributes, units, dataPointsType, metricType) {
    const attribue_list = []
    Object.keys(attributes).forEach((key) => {
      attribue_list.push({
        key: key,
        value: { stringValue: attributes[key] },
      });
    });

    this.metric.resourceMetrics[0].scopeMetrics[0].metrics.push({
      name: metricName,
      unit: units,
      [metricType]: {
        dataPoints: [
          {
            [dataPointsType]: metricValue,
            timeUnixNano: Date.now() * 1000000,
            attributes: attribue_list,
          }
        ],
      }
    });
    
    if (metricType == 'sum') {
      this.metric.resourceMetrics[0].scopeMetrics[0].metrics.at(-1).sum["aggregationTemporality"] = "AGGREGATION_TEMPORALITY_CUMULATIVE";
      this.metric.resourceMetrics[0].scopeMetrics[0].metrics.at(-1).sum["isMonotonic"] = true;
    }
  }
}

// eslint-disable-next-line no-unused-vars
const timer = setInterval(() => {
    try {
      let averageLatency = 0;
      if (requestCount > 0) {
        averageLatency = averageLatencySum / requestCount;
      }
      let averageLatencyFactory = 0;
      if (requestCountFactory > 0) {
        averageLatencyFactory = averageLatencySumFactory / requestCountFactory;
      }

      let new_metric = new MetricBuilder();
      new_metric.add_metric('system', getCpuUsagePercentage(), { system: 'CPU' }, '%', 'asDouble', 'gauge');
      new_metric.add_metric('system', getMemoryUsagePercentage(), { system: 'RAM' }, '%', 'asDouble', 'gauge');
      new_metric.add_metric('latency', averageLatency, { latency: 'latency' }, 'ms', 'asDouble', 'sum');
      new_metric.add_metric('latency', averageLatencyFactory, { latency: 'latencyFactory' }, 'ms', 'asDouble', 'sum');
      new_metric.add_metric('money', revenue, { revenues: 'money' }, '1', 'asDouble', 'sum');
      new_metric.add_metric('users', currentUsers, { users: 'active_users' }, '1', 'asInt', 'gauge');

      Object.keys(requests).forEach((endpoint) => {
        new_metric.add_metric('requests', requests[endpoint], { endpoint }, '1', 'asInt', 'sum');
      });

      Object.keys(authAttempts).forEach((key) => {
        new_metric.add_metric('users', authAttempts[key], { key }, '1', 'asInt', 'sum');
      });

      Object.keys(pizzaSold).forEach((pizza) => {
        new_metric.add_metric('pizza', pizzaSold[pizza], { pizza }, '1', 'asInt', 'sum');
      });

      sendMetricToGrafana(new_metric.metric);
      averageLatencySum = 0;
      averageLatencySumFactory = 0;
      requestCount = 0;
      requestCountFactory = 0;
} catch (error) {
    console.log('Error sending metrics', error);
}
}, 10000);

function sendMetricToGrafana(metric) {
  const body = JSON.stringify(metric);

  fetch(`${config.metrics.url}`, {
      method: 'POST',
      body: body,
      headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
  })
      .then((response) => {
          if (!response.ok) {
              response.text().then((text) => {
                  console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
          });
          }
      })
      .catch((error) => {
          console.error('Error pushing metrics:', error);
      });
}

  module.exports = { requestsTracker, latency, usersCheck, factoryLatency };