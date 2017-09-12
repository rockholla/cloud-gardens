'use strict';

module.exports = {
  Gardener: require('./gardener'),

  validateArgs: function (args) {
    if (args && (!args.region || !args.profile)) throw 'a region and profile are required for gardening in AWS';
    return true;
  },

  getTerraformArgs: function (argv, config, keyName, hostedZoneId) {
    return {
      'name': argv.garden,
      'domain': config.domain,
      'key_name': keyName,
      'bastion_ami': config.bastion.ami,
      'bastion_count': config.bastion.count,
      'bastion_instance_type': config.bastion.type,
      'bastion_disk_size': config.bastion.disk_size,
      'hosted_zone_id': hostedZoneId,
      'ci_subdomain': config.bastion.subdomains.ci,
      'status_subdomain': config.bastion.subdomains.status,
      'ansible_tags': argv.tags,
      'ecs_min_size': config.ecs.hosts.counts.min,
      'ecs_max_size': config.ecs.hosts.counts.max,
      'ecs_desired_capacity': config.ecs.hosts.counts.desired,
      'ecs_instance_type': config.ecs.hosts.type,
      'ecs_docker_volume_size': config.ecs.hosts.disk_size
    };
  },

};
